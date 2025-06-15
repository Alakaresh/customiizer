<?php
add_action('rest_api_init', function () {
    register_rest_route('custom-api/v1', '/variant/(?P<id>\d+)/mockup-position', [
        'methods'  => 'POST',
        'callback' => 'customiizer_update_mockup_position',
        'permission_callback' => '__return_true',
    ]);
});

function customiizer_update_mockup_position(WP_REST_Request $request) {
    global $wpdb;

    $variant_id = intval($request['id']);
    $position_top = floatval($request->get_param('position_top'));
    $position_left = floatval($request->get_param('position_left'));

    if ($variant_id <= 0) {
        return new WP_REST_Response(['success' => false, 'message' => 'Invalid variant id'], 400);
    }

    $result = $wpdb->update(
        'WPC_variant_mockup',
        [
            'position_top'  => $position_top,
            'position_left' => $position_left,
        ],
        ['variant_id' => $variant_id],
        ['%f', '%f'],
        ['%d']
    );

    if (false === $result) {
        return new WP_REST_Response(['success' => false, 'message' => 'Update failed'], 500);
    }

    return new WP_REST_Response(['success' => true], 200);
}
