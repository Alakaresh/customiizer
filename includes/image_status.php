<?php

function check_image_status() {
    global $wpdb;

    $taskId = isset($_POST['taskId']) ? sanitize_text_field(wp_unslash($_POST['taskId'])) : '';
    customiizer_log('image_status', "check_image_status appelé pour taskId={$taskId}");

    if ($taskId === '') {
        customiizer_log('image_status', 'taskId manquant pour check_image_status');
        wp_send_json_error(['message' => 'taskId manquant'], 400);
    }

    $tables = customiizer_get_generation_tables();
    $jobsTable = $tables['jobs'];
    $imagesTable = $tables['images'];

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

    $progressValue = customiizer_normalize_progress_value($job['progress'] ?? null);
    $upscaleCount = customiizer_calculate_job_upscale_count($job, $tables);

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
        $response['images'] = customiizer_fetch_generated_images([
            'job_id'    => (int) $job['id'],
            'order_by'  => 'image_number',
            'order'     => 'ASC',
            'normalize' => true,
            'fields'    => [
                'image_number',
                'image_url',
                'format_image',
                'prompt',
                'settings',
                'image_prefix',
                'job_id',
            ],
        ]);
    }

    wp_send_json_success($response);
}

function customiizer_get_job_images() {
    global $wpdb;

    $jobId = isset($_POST['jobId']) ? intval(wp_unslash($_POST['jobId'])) : 0;

    if ($jobId <= 0) {
        wp_send_json_error(['message' => 'jobId manquant'], 400);
    }

    $images = customiizer_fetch_generated_images([
        'job_id'    => $jobId,
        'order_by'  => 'image_number',
        'order'     => 'ASC',
        'normalize' => true,
        'fields'    => [
            'image_number',
            'image_url',
            'format_image',
            'prompt',
            'settings',
            'image_prefix',
            'job_id',
        ],
    ]);

    wp_send_json_success([
        'jobId' => $jobId,
        'images' => $images,
    ]);
}

add_action('wp_ajax_check_image_status', 'check_image_status');
add_action('wp_ajax_nopriv_check_image_status', 'check_image_status');
add_action('wp_ajax_get_job_images', 'customiizer_get_job_images');
add_action('wp_ajax_nopriv_get_job_images', 'customiizer_get_job_images');

function customiizer_normalize_progress_value($rawProgress) {
    if ($rawProgress === null || $rawProgress === '') {
        return null;
    }

    if (is_string($rawProgress)) {
        $rawProgress = trim(str_replace('%', '', $rawProgress));
    }

    return is_numeric($rawProgress) ? (float) $rawProgress : null;
}

function customiizer_calculate_job_upscale_count(array $job, array $tables) {
    global $wpdb;

    if (array_key_exists('upscale_done', $job) && $job['upscale_done'] !== null) {
        return (int) $job['upscale_done'];
    }

    $choicePrefix = $wpdb->esc_like('choice_') . '%';
    $upscaleResult = $wpdb->get_var(
        $wpdb->prepare(
            "SELECT COUNT(*) FROM {$tables['images']} WHERE job_id = %d AND image_prefix LIKE %s",
            (int) $job['id'],
            $choicePrefix
        )
    );

    $upscaleCount = ($upscaleResult !== null) ? (int) $upscaleResult : 0;

    if ($upscaleCount > 0) {
        $wpdb->update(
            $tables['jobs'],
            ['upscale_done' => $upscaleCount],
            ['id' => (int) $job['id']],
            ['%d'],
            ['%d']
        );
    }

    return $upscaleCount;
}
