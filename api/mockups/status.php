<?php
register_rest_route('api/v1/mockups', '/status/(?P<task_id>[^/]+)', [
    'methods'  => 'GET',
    'callback' => 'customiizer_get_mockup_status',
    'permission_callback' => 'customiizer_api_permissions',
]);
function customiizer_get_mockup_status(WP_REST_Request $req) {
    $task_id = sanitize_text_field($req['task_id']);
    $data = get_transient('mockup_task_' . $task_id);
    if (!$data) {
        return new WP_REST_Response(['status' => 'not_found'], 404);
    }
    $status = $data['status'] ?? 'pending';
    $response = ['status' => $status];
    if ($status === 'completed') {
        $response['mockup_url'] = $data['mockup_url'] ?? '';
    } elseif ($status === 'failed') {
        $response['error'] = $data['error'] ?? 'unknown';
    }
    return new WP_REST_Response($response, 200);
}
