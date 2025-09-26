<?php

function customiizer_job_progress_key($taskId) {
    return 'customiizer_job_progress_' . md5((string) $taskId);
}

function customiizer_store_job_progress($taskId, array $payload, $expiration = HOUR_IN_SECONDS) {
    if (!function_exists('set_transient')) {
        return false;
    }

    $key = customiizer_job_progress_key($taskId);
    $sanitized = [
        'taskId' => (string) $taskId,
        'jobId' => isset($payload['jobId']) ? (int) $payload['jobId'] : null,
        'status' => isset($payload['status']) ? sanitize_text_field($payload['status']) : '',
        'progress' => isset($payload['progress']) ? max(0, min(100, (int) $payload['progress'])) : null,
        'message' => isset($payload['message']) ? sanitize_text_field($payload['message']) : '',
        'updated_at' => isset($payload['updated_at']) ? sanitize_text_field($payload['updated_at']) : current_time('mysql'),
        'metadata' => isset($payload['metadata']) && is_array($payload['metadata']) ? $payload['metadata'] : [],
        'result' => isset($payload['result']) && is_array($payload['result']) ? $payload['result'] : [],
    ];

    if (!empty($sanitized['metadata'])) {
        array_walk_recursive(
            $sanitized['metadata'],
            static function (&$value) {
                if (is_scalar($value)) {
                    $value = sanitize_text_field((string) $value);
                }
            }
        );
    }

    if (!empty($sanitized['result'])) {
        if (isset($sanitized['result']['url'])) {
            $sanitized['result']['url'] = esc_url_raw($sanitized['result']['url']);
        }
        if (isset($sanitized['result']['thumbnail'])) {
            $sanitized['result']['thumbnail'] = esc_url_raw($sanitized['result']['thumbnail']);
        }
    }

    return set_transient($key, $sanitized, max(5 * MINUTE_IN_SECONDS, (int) $expiration));
}

function customiizer_fetch_job_progress($taskId) {
    if (!function_exists('get_transient')) {
        return [];
    }

    $key = customiizer_job_progress_key($taskId);
    $stored = get_transient($key);

    return is_array($stored) ? $stored : [];
}

function customiizer_clear_job_progress($taskId) {
    if (!function_exists('delete_transient')) {
        return false;
    }

    return delete_transient(customiizer_job_progress_key($taskId));
}

function customiizer_clear_generation_progress_event($taskId) {
    if ($taskId === null || $taskId === '') {
        return;
    }

    customiizer_clear_job_progress($taskId);
}

add_action('customiizer_clear_generation_progress', 'customiizer_clear_generation_progress_event', 10, 1);

function customiizer_decode_settings($value) {
    if ($value === '' || $value === null) {
        return [];
    }

    $decoded = json_decode($value, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
        return $decoded;
    }

    return $value;
}

function check_image_status() {
    global $wpdb;

    $taskId = isset($_POST['taskId']) ? sanitize_text_field(wp_unslash($_POST['taskId'])) : '';
    customiizer_log('image_status', "check_image_status appelé pour taskId={$taskId}");

    if ($taskId === '') {
        customiizer_log('image_status', 'taskId manquant pour check_image_status');
        wp_send_json_error(['message' => 'taskId manquant']);
    }

    $customPrefix = 'WPC_';
    $jobsTable = $customPrefix . 'generation_jobs';
    $imagesTable = $customPrefix . 'generated_image';

    $job = $wpdb->get_row(
        $wpdb->prepare(
            "SELECT id, status, prompt, format_image, created_at, updated_at FROM {$jobsTable} WHERE task_id = %s",
            $taskId
        ),
        ARRAY_A
    );

    if (!$job) {
        customiizer_log('image_status', "Aucun job trouvé pour taskId={$taskId}");
        wp_send_json_error(['message' => 'Aucun job trouvé']);
    }

    $response = [
        'taskId' => $taskId,
        'jobId' => (int) $job['id'],
        'status' => $job['status'],
        'prompt' => $job['prompt'],
        'format' => $job['format_image'],
        'createdAt' => $job['created_at'],
        'updatedAt' => $job['updated_at'],
    ];

    $progressData = customiizer_fetch_job_progress($taskId);
    if (!empty($progressData)) {
        $response['progress'] = isset($progressData['progress']) ? (int) $progressData['progress'] : null;
        $response['progressStatus'] = $progressData['status'] ?? '';
        $response['progressMessage'] = $progressData['message'] ?? '';
        $response['progressUpdatedAt'] = $progressData['updated_at'] ?? '';

        if (!empty($progressData['result']['url'])) {
            $response['previewUrl'] = esc_url_raw($progressData['result']['url']);
        }
    }

    if ($job['status'] === 'done') {
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT image_number, image_url, format_image, prompt, settings FROM {$imagesTable} WHERE job_id = %d ORDER BY image_number ASC",
                $job['id']
            ),
            ARRAY_A
        );

        $response['images'] = array_map(
            static function ($row) {
                return [
                    'id' => isset($row['image_number']) ? (int) $row['image_number'] : null,
                    'url' => $row['image_url'] ?? '',
                    'format' => $row['format_image'] ?? '',
                    'prompt' => $row['prompt'] ?? '',
                    'settings' => customiizer_decode_settings($row['settings'] ?? ''),
                ];
            },
            $rows ?: []
        );
    }

    wp_send_json_success($response);
}

add_action('wp_ajax_check_image_status', 'check_image_status');
add_action('wp_ajax_nopriv_check_image_status', 'check_image_status');
