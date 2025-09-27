<?php

if (!defined('ABSPATH')) {
    exit;
}

register_rest_route('api/v1/generation', '/progress', [
    'methods' => 'GET',
    'callback' => 'customiizer_get_generation_progress',
    'permission_callback' => 'customiizer_generation_progress_permission',
    'args' => [
        'job_id' => [
            'description' => 'Identifiant interne du job de génération.',
            'type' => 'integer',
            'required' => false,
        ],
        'task_id' => [
            'description' => 'Identifiant unique attribué au job au moment de sa création.',
            'type' => 'string',
            'required' => false,
        ],
        'hash' => [
            'description' => 'Hash retourné par le worker (par exemple Midjourney).',
            'type' => 'string',
            'required' => false,
        ],
    ],
]);

function customiizer_generation_progress_permission() {
    return is_user_logged_in();
}

function customiizer_get_generation_progress(WP_REST_Request $request) {
    global $wpdb;

    $jobId = absint($request->get_param('job_id'));
    $taskId = $request->get_param('task_id');
    $hash = $request->get_param('hash');

    $taskId = is_string($taskId) ? sanitize_text_field(wp_unslash($taskId)) : '';
    $hash = is_string($hash) ? sanitize_text_field(wp_unslash($hash)) : '';

    if (!$jobId && $taskId === '' && $hash === '') {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Paramètre job_id, task_id ou hash requis.',
        ], 400);
    }

    $jobsTable = 'WPC_generation_jobs';
    $job = null;

    if ($jobId) {
        $job = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT id, user_id, task_id, status, progress FROM {$jobsTable} WHERE id = %d",
                $jobId
            ),
            ARRAY_A
        );
    }

    if (!$job && $taskId !== '') {
        $job = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT id, user_id, task_id, status, progress FROM {$jobsTable} WHERE task_id = %s",
                $taskId
            ),
            ARRAY_A
        );
    }

    $transientFromHash = null;
    if (!$job && $hash !== '') {
        $transientFromHash = get_transient(sprintf('customiizer_progress_hash_%s', $hash));
        if (is_array($transientFromHash) && !empty($transientFromHash['job_id'])) {
            $job = $wpdb->get_row(
                $wpdb->prepare(
                    "SELECT id, user_id, task_id, status, progress FROM {$jobsTable} WHERE id = %d",
                    (int) $transientFromHash['job_id']
                ),
                ARRAY_A
            );
            if ($job) {
                $jobId = (int) $job['id'];
            }
        }
    }

    if (!$job) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Job introuvable.',
        ], 404);
    }

    $currentUserId = get_current_user_id();
    if (!$currentUserId || (int) $job['user_id'] !== $currentUserId) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Accès non autorisé.',
        ], 403);
    }

    $jobTransient = get_transient(sprintf('customiizer_progress_job_%d', (int) $job['id']));
    if (!is_array($jobTransient) && $hash !== '') {
        $jobTransient = $transientFromHash ?? get_transient(sprintf('customiizer_progress_hash_%s', $hash));
    }

    $progressValue = null;
    if (isset($jobTransient['progress'])) {
        $progressValue = is_numeric($jobTransient['progress'])
            ? (float) $jobTransient['progress']
            : sanitize_text_field((string) $jobTransient['progress']);
    } elseif (isset($job['progress'])) {
        $progressValue = is_numeric($job['progress'])
            ? (float) $job['progress']
            : sanitize_text_field((string) $job['progress']);
    }

    $history = [];
    if (isset($jobTransient['history']) && is_array($jobTransient['history'])) {
        foreach ($jobTransient['history'] as $entry) {
            if (!is_array($entry) || empty($entry['url'])) {
                continue;
            }

            $history[] = [
                'url' => esc_url_raw($entry['url']),
                'progress' => isset($entry['progress']) && is_numeric($entry['progress'])
                    ? (float) $entry['progress']
                    : null,
                'timestamp' => isset($entry['timestamp']) ? (int) $entry['timestamp'] : null,
            ];
        }
    }

    $latestImageUrl = '';
    if (isset($jobTransient['latest_image_url']) && $jobTransient['latest_image_url'] !== '') {
        $latestImageUrl = esc_url_raw($jobTransient['latest_image_url']);
    } elseif (!empty($history)) {
        $latestImageUrl = esc_url_raw(end($history)['url']);
    }

    $jobStatus = isset($job['status']) ? sanitize_key($job['status']) : '';

    $response = [
        'success' => true,
        'job' => [
            'id' => (int) $job['id'],
            'task_id' => isset($job['task_id']) ? sanitize_text_field($job['task_id']) : '',
            'status' => $jobStatus,
            'progress' => isset($job['progress']) && is_numeric($job['progress'])
                ? (float) $job['progress']
                : null,
        ],
        'progress' => [
            'progress' => $progressValue,
            'message' => isset($jobTransient['message']) ? sanitize_text_field($jobTransient['message']) : '',
            'status' => isset($jobTransient['status']) ? sanitize_key($jobTransient['status']) : $jobStatus,
            'url' => isset($jobTransient['url']) ? esc_url_raw($jobTransient['url']) : '',
            'latest_image_url' => $latestImageUrl,
            'history' => $history,
            'updated_at' => isset($jobTransient['updated_at']) ? (int) $jobTransient['updated_at'] : null,
        ],
    ];

    if ($hash !== '') {
        $response['progress']['hash'] = $hash;
    } elseif (isset($jobTransient['hash']) && $jobTransient['hash'] !== '') {
        $response['progress']['hash'] = sanitize_text_field($jobTransient['hash']);
    }

    if (!empty($history)) {
        $response['progress']['history_count'] = count($history);
    }

    $isFinal = in_array($response['progress']['status'], ['done', 'error'], true)
        || in_array($jobStatus, ['done', 'error'], true);

    if ($isFinal) {
        $response['completed'] = true;
    }

    return rest_ensure_response($response);
}
