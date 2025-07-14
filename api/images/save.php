<?php
register_rest_route('api/v1/images', '/save', [
	'methods' => 'POST',
	'callback' => 'save_generated_image',
        'permission_callback' => 'customiizer_api_permission',
]);
function save_generated_image(WP_REST_Request $request) {
	global $wpdb;

	$user_id = intval($request->get_param('user_id'));
	$image_url = sanitize_text_field($request->get_param('image_url'));
	$prompt = sanitize_text_field($request->get_param('prompt'));
	$format = sanitize_text_field($request->get_param('format_image'));

	if (!$user_id || !$image_url) {
		return new WP_REST_Response(['success' => false, 'message' => 'Missing required fields'], 400);
	}

	$wpdb->insert("WPC_generated_image", [
		'user_id' => $user_id,
		'image_url' => $image_url,
		'prompt' => $prompt,
		'format_image' => $format,
		'image_date' => current_time('mysql')
	]);

	return [
		'success' => true,
		'image_number' => $wpdb->insert_id
	];
}
