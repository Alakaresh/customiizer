<?php

/**
 * AJAX endpoint used to retrieve progress information for a generation job.
 */
function customiizer_get_job_progress() {
    if (!is_user_logged_in()) {
        wp_send_json_error([
            'message' => __('Authentification requise.', 'customiizer'),
        ], 401);
    }

    $job_id  = isset($_POST['jobId']) ? absint(wp_unslash($_POST['jobId'])) : 0;
    $task_id = isset($_POST['taskId']) ? sanitize_text_field(wp_unslash($_POST['taskId'])) : '';

    if ($job_id <= 0 && $task_id === '') {
        wp_send_json_error([
            'message' => __('Identifiant de job ou taskId manquant.', 'customiizer'),
        ], 400);
    }

    global $wpdb;

    $jobs_table   = 'WPC_generation_jobs';
    $images_table = 'WPC_generated_image';

    if ($job_id > 0) {
        $job = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$jobs_table} WHERE id = %d",
                $job_id
            ),
            ARRAY_A
        );
    } else {
        $job = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM {$jobs_table} WHERE task_id = %s",
                $task_id
            ),
            ARRAY_A
        );
    }

    if (!$job) {
        wp_send_json_error([
            'message' => __('Job introuvable.', 'customiizer'),
        ], 404);
    }

    $current_user_id = get_current_user_id();
    if ((int) $job['user_id'] !== $current_user_id) {
        wp_send_json_error([
            'message' => __('Accès non autorisé pour ce job.', 'customiizer'),
        ], 403);
    }

    $normalized_progress = customiizer_normalize_job_progress_value($job['progress']);

    $response = [
        'taskId'        => $job['task_id'],
        'jobId'         => (int) $job['id'],
        'status'        => $job['status'],
        'progress'      => $normalized_progress,
        'progressLabel' => customiizer_format_progress_label($job['progress']),
        'prompt'        => $job['prompt'],
        'format'        => $job['format_image'],
        'createdAt'     => $job['created_at'],
        'updatedAt'     => $job['updated_at'],
    ];

    if ('done' === $job['status']) {
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT image_number, image_url, format_image, prompt, settings FROM {$images_table} WHERE job_id = %d ORDER BY image_number ASC",
                (int) $job['id']
            ),
            ARRAY_A
        );

        if ($rows) {
            $response['images'] = array_map(
                static function ($row) {
                    return [
                        'id'       => isset($row['image_number']) ? (int) $row['image_number'] : null,
                        'url'      => $row['image_url'] ?? '',
                        'format'   => $row['format_image'] ?? '',
                        'prompt'   => $row['prompt'] ?? '',
                        'settings' => customiizer_decode_image_settings($row['settings'] ?? ''),
                    ];
                },
                $rows
            );
        } else {
            $response['images'] = [];
        }
    }

    wp_send_json_success($response);
}
add_action('wp_ajax_get_job_progress', 'customiizer_get_job_progress');
add_action('wp_ajax_nopriv_get_job_progress', 'customiizer_get_job_progress');

/**
 * Decode the JSON settings stored for a generated image.
 *
 * @param mixed $value Raw value stored in the database.
 *
 * @return array|string
 */
function customiizer_decode_image_settings($value) {
    if ($value === '' || null === $value) {
        return [];
    }

    if (is_string($value)) {
        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }
    }

    return $value;
}

/**
 * Normalize the stored progress value into a float between 0 and 100 when possible.
 *
 * @param mixed $progress Stored progress value.
 */
function customiizer_normalize_job_progress_value($progress) {
    if (is_numeric($progress)) {
        $normalized = (float) $progress;
        if (!is_finite($normalized)) {
            return null;
        }

        if ($normalized < 0) {
            $normalized = 0.0;
        } elseif ($normalized > 100) {
            $normalized = 100.0;
        }

        return round($normalized, 2);
    }

    return null;
}

/**
 * Provide a human readable label for the stored progress value.
 *
 * @param mixed $progress Stored progress value.
 */
function customiizer_format_progress_label($progress) {
    if (is_numeric($progress)) {
        $numeric = customiizer_normalize_job_progress_value($progress);
        if (null === $numeric) {
            return '';
        }

        return sprintf(__('Progression : %s%%', 'customiizer'), rtrim(rtrim(number_format_i18n($numeric, 2), '0'), '.'));
    }

    if (is_string($progress)) {
        return $progress;
    }

    return '';
}
