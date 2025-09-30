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

add_action('wp_ajax_get_job_images', 'customiizer_get_job_images');
add_action('wp_ajax_nopriv_get_job_images', 'customiizer_get_job_images');
