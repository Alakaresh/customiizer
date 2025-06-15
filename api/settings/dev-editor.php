<?php
register_rest_route('api/v1/settings', '/dev-editor', [
    'methods' => 'GET',
    'callback' => 'customiizer_get_dev_editor',
    'permission_callback' => '__return_true',
]);

register_rest_route('api/v1/settings', '/dev-editor', [
    'methods' => 'POST',
    'callback' => 'customiizer_set_dev_editor',
    'permission_callback' => '__return_true',
]);

function customiizer_get_dev_editor() {
    return new WP_REST_Response([
        'enabled' => (bool) get_option('customiizer_dev_editor')
    ], 200);
}

function customiizer_set_dev_editor(WP_REST_Request $req) {
    $enabled = $req->get_json_params()['enabled'] ?? false;
    update_option('customiizer_dev_editor', $enabled ? '1' : '0');
    return new WP_REST_Response([
        'success' => true,
        'enabled' => (bool) $enabled
    ], 200);
}
