<?php
// Déclaration directe du hook REST API

register_rest_route('api/v1/products', '/list', [
	'methods' => 'GET',
	'callback' => 'products_list',
        'permission_callback' => 'customiizer_api_permission',
]);

function products_list( WP_REST_Request $request ) {
	global $wpdb;
	$prefix = 'WPC_';

	// Lire le paramètre GET ?include_inactive=1
	$includeInactive = $request->get_param('include_inactive') === '1';

	$whereClause = $includeInactive ? '1=1' : 'p.is_active = 1';

	$query = "
		SELECT 
			p.product_id, 
			p.name, 
			p.is_active,
			MIN(vp.sale_price) AS lowest_price,
			vm.image AS image
		FROM 
			{$prefix}products AS p
		LEFT JOIN 
			{$prefix}variants AS v ON p.product_id = v.product_id
		LEFT JOIN 
			{$prefix}variant_prices AS vp ON vp.variant_id = v.variant_id
		LEFT JOIN 
			{$prefix}variant_mockup AS vm ON vm.variant_id = v.variant_id
		WHERE 
			{$whereClause}
		GROUP BY 
			p.product_id
	";

	$results = $wpdb->get_results($query, ARRAY_A);

	if (empty($results)) {
		return new WP_REST_Response('Aucun produit trouvé', 404);
	}

	$products = array_map(function($row) {
		return [
			'product_id'   => (int) $row['product_id'],
			'name'         => $row['name'],
			'image'        => $row['image'],
			'lowest_price' => (float) $row['lowest_price'],
			'is_active'    => (int) $row['is_active'],
		];
	}, $results);

	return new WP_REST_Response($products, 200);
}

