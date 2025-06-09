<?php
register_rest_route('api/v1/products', '/(?P<id>\d+)/toggle', [
	'methods' => 'POST',
	'callback' => 'toggle_product_status',
	'permission_callback' => '__return_true',
]);
function toggle_product_status(WP_REST_Request $request) {
	global $wpdb;
	$id = (int) $request['id'];
	$is_active = $request->get_json_params()['is_active'] ?? null;

	if (!in_array($is_active, [0, 1], true)) {
		return new WP_REST_Response(['success' => false, 'message' => 'Valeur invalide pour is_active'], 400);
	}

	$updated = $wpdb->update('WPC_products', ['is_active' => $is_active], ['product_id' => $id]);

	return new WP_REST_Response(['success' => (bool) $updated], $updated !== false ? 200 : 500);
}
