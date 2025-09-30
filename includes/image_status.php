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

function customiizer_normalize_generated_image_row($row) {
    return [
        'id' => isset($row['image_number']) ? (int) $row['image_number'] : null,
        'url' => $row['image_url'] ?? '',
        'format' => $row['format_image'] ?? '',
        'prompt' => $row['prompt'] ?? '',
        'prefix' => $row['image_prefix'] ?? '',
        'settings' => customiizer_decode_settings($row['settings'] ?? ''),
    ];
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
            "SELECT id, status, prompt, format_image, progress, image_url, created_at, updated_at, upscale_done FROM {$jobsTable} WHERE task_id = %s",
            $taskId
        ),
        ARRAY_A
    );

    if (!$job) {
        customiizer_log('image_status', "Aucun job trouvé pour taskId={$taskId}");
        wp_send_json_error(['message' => 'Aucun job trouvé']);
    }

    $rawProgress = $job['progress'] ?? null;
    if (is_string($rawProgress)) {
        $rawProgress = trim(str_replace('%', '', $rawProgress));
    }

    $progressValue = is_numeric($rawProgress) ? (float) $rawProgress : null;

    $upscaleCount = 0;
    $upscaleColumnFilled = array_key_exists('upscale_done', $job) && $job['upscale_done'] !== null;

    if ($upscaleColumnFilled) {
        $upscaleCount = (int) $job['upscale_done'];
    } else {
        $choicePrefix = $wpdb->esc_like('choice_') . '%';
        $upscaleQuery = $wpdb->prepare(
            "SELECT COUNT(*) FROM {$imagesTable} WHERE job_id = %d AND image_prefix LIKE %s",
            (int) $job['id'],
            $choicePrefix
        );

        $upscaleResult = $wpdb->get_var($upscaleQuery);
        if ($upscaleResult !== null) {
            $upscaleCount = (int) $upscaleResult;
            if ($upscaleCount > 0) {
                $wpdb->update(
                    $jobsTable,
                    ['upscale_done' => $upscaleCount],
                    ['id' => (int) $job['id']],
                    ['%d'],
                    ['%d']
                );
            }
        }
    }

    $response = [
        'taskId' => $taskId,
        'jobId' => (int) $job['id'],
        'status' => $job['status'],
        'prompt' => $job['prompt'],
        'format' => $job['format_image'],
        'progress' => $progressValue,
        'createdAt' => $job['created_at'],
        'updatedAt' => $job['updated_at'],
        'imageUrl' => isset($job['image_url']) ? $job['image_url'] : '',
        'upscale_done' => $upscaleCount,
    ];

    if ($job['status'] === 'done') {
        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT image_number, image_url, format_image, prompt, settings, image_prefix FROM {$imagesTable} WHERE job_id = %d ORDER BY image_number ASC",
                $job['id']
            ),
            ARRAY_A
        );

        $response['images'] = array_map('customiizer_normalize_generated_image_row', $rows ?: []);
    }

    wp_send_json_success($response);
}

function customiizer_get_job_images() {
    global $wpdb;

    $jobId = isset($_POST['jobId']) ? intval(wp_unslash($_POST['jobId'])) : 0;

    if ($jobId <= 0) {
        wp_send_json_error(['message' => 'jobId manquant']);
    }

    $customPrefix = 'WPC_';
    $imagesTable = $customPrefix . 'generated_image';

    $rows = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT image_number, image_url, format_image, prompt, settings, image_prefix FROM {$imagesTable} WHERE job_id = %d ORDER BY image_number ASC",
            $jobId
        ),
        ARRAY_A
    );

    $images = array_map('customiizer_normalize_generated_image_row', $rows ?: []);

    wp_send_json_success([
        'jobId' => $jobId,
        'images' => $images,
    ]);
}

add_action('wp_ajax_check_image_status', 'check_image_status');
add_action('wp_ajax_nopriv_check_image_status', 'check_image_status');
add_action('wp_ajax_get_job_images', 'customiizer_get_job_images');
add_action('wp_ajax_nopriv_get_job_images', 'customiizer_get_job_images');
