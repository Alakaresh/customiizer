<?php

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

    $jobsTable = $wpdb->prefix . 'generation_jobs';
    $imagesTable = $wpdb->prefix . 'generated_image';

    $job = $wpdb->get_row(
        $wpdb->prepare(
            "SELECT id, status, prompt, settings, created_at, updated_at FROM {$jobsTable} WHERE task_id = %s",
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
        'settings' => customiizer_decode_settings($job['settings']),
        'createdAt' => $job['created_at'],
        'updatedAt' => $job['updated_at'],
    ];

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
