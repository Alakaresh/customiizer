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

        // --- Transient cache ---
        $cache_key = 'community_images_' . md5(serialize([
                'limit'  => $limit,
                'offset' => $offset,
                'user'   => $current_user_id,
                'sort'   => $sort,
                'search' => $search,
        ]));
        $cached = get_transient($cache_key);
        if ($cached !== false) {
                return new WP_REST_Response([
                        'success' => true,
                        'images'  => $cached
                ], 200);
        }

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

        // Requête principale sans sous-requêtes ligne par ligne
        $query = $wpdb->prepare(
                "
    SELECT
        g.image_number,
        g.image_url,
        g.format_image,
        g.prompt,
        g.image_date,
        g.user_id,
        u.display_name,
        COALESCE(l.like_count, 0) AS like_count,
        COALESCE(f.favorite_count, 0) AS favorite_count,
        CASE WHEN ul.user_id IS NULL THEN 0 ELSE 1 END AS liked_by_user,
        CASE WHEN uf.user_id IS NULL THEN 0 ELSE 1 END AS favorited_by_user
    FROM WPC_generated_image g
    LEFT JOIN {$wpdb->prefix}users u ON g.user_id = u.ID
    LEFT JOIN (
        SELECT image_id, COUNT(*) AS like_count
        FROM WPC_image_likes
        GROUP BY image_id
    ) l ON l.image_id = g.image_number
    LEFT JOIN (
        SELECT image_id, COUNT(*) AS favorite_count
        FROM WPC_image_favorites
        GROUP BY image_id
    ) f ON f.image_id = g.image_number
    LEFT JOIN WPC_image_likes ul ON ul.image_id = g.image_number AND ul.user_id = %d
    LEFT JOIN WPC_image_favorites uf ON uf.image_id = g.image_number AND uf.user_id = %d
    WHERE g.image_url IS NOT NULL{$searchClause}
    GROUP BY g.image_number
    ORDER BY {$orderBy}
    ",
                $current_user_id,
                $current_user_id
        );


	// Ajouter dynamiquement le LIMIT si besoin
	$query .= " " . $limitClause;

        $results = $wpdb->get_results($query);

        if (empty($results)) {
                set_transient($cache_key, [], MINUTE_IN_SECONDS * 5);
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

        set_transient($cache_key, $images, MINUTE_IN_SECONDS * 5);

        return new WP_REST_Response([
                'success' => true,
                'images' => $images
        ], 200);
}
