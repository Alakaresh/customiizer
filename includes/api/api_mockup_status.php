<?php
add_action('rest_api_init', function() {
    register_rest_route('customiizer/v1', '/mockup-status', [
        'methods'  => 'GET',
        'callback' => 'customiizer_get_mockup_status',
        'permission_callback' => 'customiizer_api_permission',
    ]);
});

function customiizer_get_mockup_status(WP_REST_Request $request) {
    $task_id = intval($request->get_param('task_id'));
    if (!$task_id) {
        return new WP_REST_Response(['success' => false, 'message' => 'missing task_id'], 400);
    }

    $cache_key = 'customiizer_mockup_result_' . $task_id;
    $rows = get_transient($cache_key);

    if (!$rows) {
        return new WP_REST_Response(['success' => false, 'mockups' => []], 200);
    }

    delete_transient($cache_key);
    return new WP_REST_Response(['success' => true, 'mockups' => $rows], 200);
}
