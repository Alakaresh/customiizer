<?php
register_rest_route('api/v1/products', '/format', [
	'methods'  => 'GET',
	'callback' => 'api_get_product_from_format',
	'args'     => [
		'format' => [
			'required' => true,
			'sanitize_callback' => 'sanitize_text_field',
		],
	],
	'permission_callback' => 'customiizer_api_permissions',
]);

function api_get_product_from_format($request) {
	global $wpdb;
	$format = $request->get_param('format');

	$results = $wpdb->get_results($wpdb->prepare("
		SELECT 
			p.product_id,
			p.name AS product_name,
			v.variant_id,
			v.size AS variant_size,
			v.color
		FROM WPC_products p
		INNER JOIN WPC_variants v ON p.product_id = v.product_id
		WHERE v.ratio_image = %s
		AND p.is_active = 1
		GROUP BY p.product_id, v.variant_id
		LIMIT 5
	", $format), ARRAY_A);

	if ($results) {
		return [
			'success' => true,
			'choices' => $results
		];
	} else {
		return [
			'success' => false,
			'message' => 'Aucun produit trouvé pour ce format.'
		];
	}
}
