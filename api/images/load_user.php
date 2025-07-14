<?php
register_rest_route('api/v1/images', '/load/(?P<user_id>\d+)', [
	'methods' => 'GET',
	'callback' => 'load_user_images',
        'permission_callback' => 'customiizer_api_permission',
]);
function load_user_images(WP_REST_Request $request) {
	global $wpdb;

	$limit = intval($request->get_param('limit')) ?: 50;
	$offset = intval($request->get_param('offset')) ?: 0;
	$user_id = intval($request->get_param('user_id'));

	if (!$user_id) {
		return new WP_REST_Response([
			'success' => false,
			'message' => 'Missing user_id parameter.'
		], 400);
	}

	$results = $wpdb->get_results(
		$wpdb->prepare(
			"
            SELECT 
                g.image_number, 
                g.image_url, 
                g.format_image, 
                g.prompt, 
                g.image_date,
                g.user_id,
                u.display_name
            FROM WPC_generated_image g
            LEFT JOIN {$wpdb->prefix}users u ON g.user_id = u.ID
            WHERE g.user_id = %d
            ORDER BY g.image_date DESC
            LIMIT %d OFFSET %d
            ",
			$user_id,
			$limit,
			$offset
		)
	);

	if (empty($results)) {
		return new WP_REST_Response([
			'success' => false,
			'message' => 'No images found for this user.'
		], 200);
	}

	$images = array_map(function($row) {
		return [
			'image_number' => $row->image_number,
			'image_url' => $row->image_url,
			'format' => $row->format_image,
			'prompt' => $row->prompt,
			'date' => $row->image_date,
			'user_id' => $row->user_id,
			'display_name' => $row->display_name ?: 'Unknown',
			// Plus besoin de 'user_logo'
		];
	}, $results);

	return new WP_REST_Response([
		'success' => true,
		'images' => $images
	], 200);
}
