<?php
register_rest_route('api/v1/images', '/favorites/(?P<user_id>\d+)', [
	'methods' => 'GET',
	'callback' => 'load_user_favorites',
	'permission_callback' => 'customiizer_api_permissions',
]);
function load_user_favorites(WP_REST_Request $request) {
	global $wpdb;

	$user_id = intval($request->get_param('user_id'));
	$limit = intval($request->get_param('limit')) ?: 50;
	$offset = intval($request->get_param('offset')) ?: 0;

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
                g.image_number, g.image_url, g.format_image, g.prompt, g.image_date, g.user_id as author_id, u.display_name
            FROM WPC_image_favorites f
            INNER JOIN WPC_generated_image g ON f.image_id = g.image_number
            LEFT JOIN {$wpdb->prefix}users u ON g.user_id = u.ID
            WHERE f.user_id = %d
            AND g.user_id != %d
            ORDER BY g.image_date DESC
            LIMIT %d OFFSET %d
            ",
			$user_id,
			$user_id,
			$limit,
			$offset
		)
	);

	if (empty($results)) {
		return new WP_REST_Response([
			'success' => false,
			'message' => 'No favorite images found for this user.'
		], 200);
	}

	$images = array_map(function($row) {
		return [
			'image_number' => $row->image_number,
			'image_url' => $row->image_url,
			'format' => $row->format_image,
			'prompt' => $row->prompt,
			'date' => $row->image_date,
			'author' => $row->display_name ?: 'Unknown'
		];
	}, $results);

	return new WP_REST_Response([
		'success' => true,
		'images' => $images
	], 200);
}
