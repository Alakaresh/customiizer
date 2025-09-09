<?php
register_rest_route('api/v1/products', '/(?P<id>\d+)', [
	'methods' => 'GET',
	'callback' => 'product',
	'permission_callback' => '__return_true',
]);

function product($request) {
	global $wpdb;
	$product_id = intval($request['id']);
	$prefix = 'WPC_';  // Préfixe personnalisé

	$query = $wpdb->prepare("
    SELECT
        v.variant_id, v.color, v.size, v.ratio_image, v.url_3d, v.zone_3d_name,
        vp.sale_price, vp.delivery_price, vp.delivery_time,
        st.availability AS stock,
        pr.technique, pr.placement,
        vt.image_url   AS template_image_url,
        vt.image_path  AS template_image_path,
        vt.template_width,
        vt.template_height,
        vt.print_area_width,
        vt.print_area_height,
        vt.print_area_top,
        vt.print_area_left,
        vm.mockup_id, vm.image AS mockup_image, vm.position_top, vm.position_left, vm.view_name,
        p.description AS product_description
    FROM {$prefix}variants AS v
    LEFT JOIN {$prefix}variant_prices AS vp ON vp.variant_id = v.variant_id
    LEFT JOIN {$prefix}variant_print AS pr ON pr.variant_id = v.variant_id
    LEFT JOIN {$prefix}variant_templates AS vt ON vt.variant_id = v.variant_id
    LEFT JOIN {$prefix}variant_mockup AS vm ON vm.variant_id = v.variant_id
    LEFT JOIN {$prefix}products AS p ON p.product_id = v.product_id
    LEFT JOIN {$prefix}variant_stock AS st ON st.variant_id = v.variant_id AND st.region = %s
    WHERE v.product_id = %d
    ORDER BY v.size ASC, v.variant_id ASC, vm.mockup_id ASC
", 'france', $product_id);


	$results = $wpdb->get_results($query, ARRAY_A);

	if (empty($results)) {
		return new WP_REST_Response(['error' => 'Aucune variante trouvée.'], 404);
	}

	$variants = [];
	$productDescription = null;

	foreach ($results as $row) {
		$variant_id = $row['variant_id'];

		if (!$productDescription) {
			$productDescription = $row['product_description'];
		}

                if (!isset($variants[$variant_id])) {
                        $variants[$variant_id] = [
                                'variant_id' => $variant_id,
                                'color' => $row['color'],
                                'size' => $row['size'],
                                'ratio_image' => $row['ratio_image'],
                                'url_3d' => $row['url_3d'],
                                'zone_3d_name' => $row['zone_3d_name'],
                                'price' => floatval($row['sale_price']),
                                'delivery_price' => floatval($row['delivery_price']),
                                'delivery_time' => $row['delivery_time'],
                                'stock' => $row['stock'],
                                'technique' => $row['technique'],
                                'print_area_width' => floatval($row['print_area_width']),
                                'print_area_height' => floatval($row['print_area_height']),
                                'print_area_top' => floatval($row['print_area_top']),
                                'print_area_left' => floatval($row['print_area_left']),
                                'template_width' => floatval($row['template_width']),
                                'template_height' => floatval($row['template_height']),
                                'template_image_url' => $row['template_image_url'],
                                'template_image_path' => $row['template_image_path'],
                                'placement' => $row['placement'],
                                'template' => [
                                        'image_url' => $row['template_image_url'],
                                        'image_path' => $row['template_image_path'],
                                        'width' => floatval($row['template_width']),
                                        'height' => floatval($row['template_height']),
                                        'print_area' => [
                                                'width' => floatval($row['print_area_width']),
                                                'height' => floatval($row['print_area_height']),
                                                'top' => floatval($row['print_area_top']),
                                                'left' => floatval($row['print_area_left']),
                                        ],
                                ],
                                'mockups' => []
                        ];
                }

		if (!empty($row['mockup_id'])) {
			$variants[$variant_id]['mockups'][] = [
                                'mockup_id' => $row['mockup_id'],
                                'mockup_image' => $row['mockup_image'],
                                'position_top' => $row['position_top'],
                                'position_left' => $row['position_left'],
                                'view_name' => $row['view_name']
                        ];
                }
	}

	return new WP_REST_Response([
		'product_description' => $productDescription,
		'variants' => array_values($variants)
	], 200);
}
?>
