<?php
register_rest_route('api/v1', '/mockups/batch', [
    'methods'  => 'POST',
    'callback' => 'customiizer_mockups_batch',
    'permission_callback' => '__return_true',
]);

function customiizer_mockups_batch(WP_REST_Request $req) {
    if (!defined('PRINTFUL_API_KEY')) {
        return new WP_REST_Response(['success' => false, 'message' => 'PRINTFUL_API_KEY missing'], 500);
    }

    $payload = $req->get_json_params();
    $tasks = $payload['tasks'] ?? null;
    if (!$tasks || !is_array($tasks)) {
        return new WP_REST_Response(['success' => false, 'message' => 'Invalid tasks array'], 400);
    }

    $base = defined('PRINTFUL_API_BASE') ? PRINTFUL_API_BASE : 'https://api.printful.com/v2';
    $url  = "$base/mockup-tasks";
    $token = PRINTFUL_API_KEY;

    $task_ids = [];
    foreach ($tasks as $task) {
        $body = [
            'format' => 'png',
            'products' => [
                [
                    'source' => 'catalog',
                    'mockup_style_ids'  => array_map('intval', (array)($task['mockup_style_ids'] ?? [])),
                    'catalog_product_id' => (int)($task['catalog_product_id'] ?? 0),
                    'catalog_variant_ids' => array_map('intval', (array)($task['catalog_variant_ids'] ?? [])),
                    'placements' => [
                        [
                            'placement' => $task['placement'] ?? '',
                            'technique' => $task['technique'] ?? '',
                            'layers' => [
                                [
                                    'type' => 'file',
                                    'url'  => $task['image_url'] ?? '',
                                    'position' => [
                                        'width'  => floatval($task['width']  ?? 0),
                                        'height' => floatval($task['height'] ?? 0),
                                        'top'    => floatval($task['top']    ?? 0),
                                        'left'   => floatval($task['left']   ?? 0),
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $headers = [
            'Authorization' => "Bearer $token",
            'Content-Type'  => 'application/json',
        ];
        if (defined('PRINTFUL_STORE_ID')) {
            $headers['X-PF-Store-Id'] = PRINTFUL_STORE_ID;
        }

        $response = wp_remote_post($url, [
            'headers' => $headers,
            'body'    => wp_json_encode($body),
            'timeout' => 20,
        ]);

        // Log rate limiting information from Printful headers
        $remaining = wp_remote_retrieve_header($response, 'x-ratelimit-remaining');
        $reset     = wp_remote_retrieve_header($response, 'x-ratelimit-reset');
        customiizer_log("Printful rate limit: remaining=$remaining reset=$reset");

        $task_data = json_decode(wp_remote_retrieve_body($response), true);
        $task_id   = $task_data['data'][0]['id'] ?? null;
        if ($task_id) {
            $task_ids[] = $task_id;
        }
    }

    return new WP_REST_Response(['success' => true, 'task_ids' => $task_ids], 200);
}
