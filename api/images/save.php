<?php

register_rest_route('api/v1/images', '/save', [
        'methods' => 'POST',
        'callback' => 'save_generated_image',
        'permission_callback' => '__return_true',
]);

function save_generated_image(WP_REST_Request $request) {
        global $wpdb;

        $jobId = intval($request->get_param('job_id'));
        $taskId = sanitize_text_field($request->get_param('task_id'));

        if (!$jobId && empty($taskId)) {
                return new WP_REST_Response([
                        'success' => false,
                        'message' => 'job_id ou task_id requis'
                ], 400);
        }

        $customPrefix = 'WPC_';
        $jobsTable = $customPrefix . 'generation_jobs';

        if ($jobId) {
                $job = $wpdb->get_row(
                        $wpdb->prepare("SELECT * FROM {$jobsTable} WHERE id = %d", $jobId),
                        ARRAY_A
                );
        } else {
                $job = $wpdb->get_row(
                        $wpdb->prepare("SELECT * FROM {$jobsTable} WHERE task_id = %s", $taskId),
                        ARRAY_A
                );
        }

        if (!$job) {
                return new WP_REST_Response([
                        'success' => false,
                        'message' => 'Job introuvable'
                ], 404);
        }

        $imagesTable = $customPrefix . 'generated_image';
        $imageUrl = esc_url_raw($request->get_param('image_url'));

        if (empty($imageUrl)) {
                return new WP_REST_Response([
                        'success' => false,
                        'message' => 'image_url requis'
                ], 400);
        }

        $existing = $wpdb->get_var(
                $wpdb->prepare(
                        "SELECT COUNT(*) FROM {$imagesTable} WHERE job_id = %d AND image_url = %s",
                        $job['id'],
                        $imageUrl
                )
        );

        if ($existing) {
                return new WP_REST_Response([
                        'success' => true,
                        'message' => 'Image déjà enregistrée'
                ], 200);
        }

        $positionRaw = $request->get_param('position');
        $prompt = $request->get_param('prompt');
        $format = $request->get_param('format_image');
        $settingsParam = $request->get_param('settings');
        $sourceId = $request->get_param('source_id');
        $upscaledId = $request->get_param('upscaled_id');

        if ($prompt === null || $prompt === '') {
                $prompt = $job['prompt'];
        }

        $settingsValue = '';
        if (is_array($settingsParam)) {
                $settingsValue = wp_json_encode($settingsParam);
        } elseif ($settingsParam !== null && $settingsParam !== '') {
                $settingsValue = (string) wp_unslash($settingsParam);
        }

        $formatValue = $format !== null ? sanitize_text_field($format) : '';
        if ($formatValue === '' && !empty($job['format_image'])) {
                $formatValue = sanitize_text_field($job['format_image']);
        }

        $imageData = [
                'job_id' => (int) $job['id'],
                'user_id' => (int) $job['user_id'],
                'image_url' => $imageUrl,
                'prompt' => sanitize_text_field($prompt),
                'format_image' => $formatValue,
                'settings' => $settingsValue,
                'image_date' => current_time('mysql'),
        ];

        $normalizedPosition = '';

        if ($positionRaw !== null && $positionRaw !== '') {
                $sanitizedPosition = sanitize_text_field($positionRaw);

                if (preg_match('/^choice_\d+$/', $sanitizedPosition)) {
                        $normalizedPosition = $sanitizedPosition;
                } else {
                        $position = (int) $sanitizedPosition;

                        if ($position > 0) {
                                $normalizedPosition = sprintf('choice_%d', $position);
                        }
                }
        }

        if ($normalizedPosition !== '') {
                $imageData['image_prefix'] = $normalizedPosition;
        }

        if ($sourceId !== null) {
                $imageData['source_id'] = sanitize_text_field($sourceId);
        }

        if ($upscaledId !== null) {
                $imageData['upscaled_id'] = sanitize_text_field($upscaledId);
        }

        $nextNumber = (int) $wpdb->get_var("SELECT MAX(image_number) FROM {$imagesTable}") + 1;
        $imageData['image_number'] = $nextNumber;

        $result = $wpdb->insert($imagesTable, $imageData);

        if ($result === false) {
                return new WP_REST_Response([
                        'success' => false,
                        'message' => 'Insertion échouée'
                ], 500);
        }

        return new WP_REST_Response([
                'success' => true,
                'image_number' => $nextNumber,
        ], 201);
}
