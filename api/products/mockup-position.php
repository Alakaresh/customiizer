<?php
register_rest_route('api/v1/products', '/variant/(?P<variant_id>\d+)/mockup-position', [
    'methods'  => 'POST',
    'callback' => 'customiizer_update_mockup_position',
    'permission_callback' => '__return_true',
]);

function customiizer_update_mockup_position(WP_REST_Request $req) {
    global $wpdb;
    $vid = (int) $req['variant_id'];
    $params = $req->get_json_params();
    $mockup_id = isset($params['mockup_id']) ? (int)$params['mockup_id'] : 0;
    $top = isset($params['top']) ? floatval($params['top']) : null;
    $left = isset($params['left']) ? floatval($params['left']) : null;

    if (!$vid || !$mockup_id || $top === null || $left === null) {
        return new WP_REST_Response(['success' => false, 'message' => 'Paramètres manquants'], 400);
    }

    $updated = $wpdb->update('WPC_variant_mockup', [
        'position_top'  => $top,
        'position_left' => $left,
    ], [
        'variant_id' => $vid,
        'mockup_id'  => $mockup_id,
    ]);

    // 🔄 Clear cached product data so new position is reflected
    $pid = $wpdb->get_var($wpdb->prepare(
        "SELECT product_id FROM WPC_variants WHERE variant_id = %d",
        $vid
    ));
    if ($pid) {
        delete_transient('customiizer_product_' . $pid);
    }

    return new WP_REST_Response(['success' => (bool)$updated], $updated === false ? 500 : 200);
}
