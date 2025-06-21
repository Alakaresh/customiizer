<?php
register_rest_route('api/v1/images', '/load', [
	'methods' => 'GET',
	'callback' => 'load_community_images',
	'permission_callback' => '__return_true',
]);
function load_community_images(WP_REST_Request $request) {
	global $wpdb;

        $limit = intval($request->get_param('limit')) ?: 0;
        $offset = intval($request->get_param('offset')) ?: 0;
        $current_user_id = intval($request->get_param('user_id')) ?: 0;
        $sort = sanitize_text_field($request->get_param('sort')) ?: 'date';
        $search = sanitize_text_field($request->get_param('search')) ?: '';

	// 🔥 Construction dynamique de la clause LIMIT/OFFSET
	$limitClause = '';
	if ($limit > 0) {
		$limitClause = $wpdb->prepare('LIMIT %d OFFSET %d', $limit, $offset);
	}

        // --- Dynamic clauses ---
        $searchClause = '';
        if ($search !== '') {
                $searchClause = $wpdb->prepare(' AND g.prompt LIKE %s', '%' . $wpdb->esc_like($search) . '%');
        }

        $orderBy = ($sort === 'likes') ? 'like_count DESC, g.image_date DESC' : 'g.image_date DESC';

        // Requête principale
        $query = $wpdb->prepare(
                "
    SELECT
        g.image_number, g.image_url, g.format_image, g.prompt, g.image_date,
        g.user_id,
        u.display_name,
        (
            SELECT COUNT(*) FROM WPC_image_likes l WHERE l.image_id = g.image_number
        ) AS like_count,
        (
            SELECT COUNT(*) FROM WPC_image_favorites f WHERE f.image_id = g.image_number
        ) AS favorite_count,
        (
            SELECT COUNT(*) FROM WPC_image_likes l WHERE l.image_id = g.image_number AND l.user_id = %d
        ) AS liked_by_user,
        (
            SELECT COUNT(*) FROM WPC_image_favorites f WHERE f.image_id = g.image_number AND f.user_id = %d
        ) AS favorited_by_user
    FROM WPC_generated_image g
    LEFT JOIN {$wpdb->prefix}users u ON g.user_id = u.ID
    WHERE g.image_url IS NOT NULL{$searchClause}
    ORDER BY {$orderBy}
    ",
                $current_user_id,
                $current_user_id
        );


	// Ajouter dynamiquement le LIMIT si besoin
	$query .= " " . $limitClause;

	$results = $wpdb->get_results($query);

	if (empty($results)) {
		return new WP_REST_Response([
			'success' => false,
			'message' => 'No community images found.'
		], 200);
	}

	$images = array_map(function($row) {
		return [
			'user_id' => intval($row->user_id), // 🔥 Force user_id en INT
			'image_number' => $row->image_number,
			'image_url' => $row->image_url,
			'format' => $row->format_image,
			'prompt' => $row->prompt,
			'display_name' => $row->display_name ?: 'Unknown',
			'date' => $row->image_date,
			'likes' => intval($row->like_count),
			'favorites' => intval($row->favorite_count),
			'liked_by_user' => intval($row->liked_by_user) > 0,
			'favorited_by_user' => intval($row->favorited_by_user) > 0
		];
	}, $results);

	return new WP_REST_Response([
		'success' => true,
		'images' => $images
	], 200);
}
