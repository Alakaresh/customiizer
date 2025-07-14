<?php
register_rest_route('api/v1/images', '/like', [
	'methods' => 'POST',
	'callback' => 'toggle_image_like',
        'permission_callback' => 'customiizer_api_permission',
]);
function toggle_image_like(WP_REST_Request $request) {
	global $wpdb;

	$user_id = intval($request->get_param('user_id'));
	$image_id = intval($request->get_param('image_id'));

	if (!$user_id || !$image_id) {
		return new WP_REST_Response(['success' => false, 'message' => 'Missing parameters'], 400);
	}

	$table = 'WPC_image_likes';
	$existing = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table WHERE user_id = %d AND image_id = %d", $user_id, $image_id));

	if ($existing) {
		$wpdb->delete($table, ['id' => $existing]);
		return ['success' => true, 'liked' => false];
	} else {
		$wpdb->insert($table, [
			'user_id' => $user_id,
			'image_id' => $image_id,
			'created_at' => current_time('mysql')
		]);
		return ['success' => true, 'liked' => true];
	}
}
