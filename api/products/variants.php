<?php
register_rest_route('api/v1/products', '/(?P<product_id>\d+)/variants', [
	'methods' => 'GET',
	'callback' => 'get_product_variants_full',
	'permission_callback' => '__return_true',
]);
function get_product_variants_full($request) {
	global $wpdb;
	$product_id = intval($request['product_id']);
	$prefix = 'WPC_';

	$query = "
		SELECT
			v.variant_id,
			v.color,
			v.size,
			v.ratio_image,
			vp.price,
			vp.sale_price,
			vp.delivery_time,
			vp.delivery_price,
			vp.custom_margin,
			vs.region,
			vs.availability,
                        vm.image AS mockup_image,
                        vm.position_top,
                        vm.position_left,
                       vm.view_name,
                       vt.image_url AS template_image,
                       vt.image_path AS template_image_path,
                       vt.template_width,
                       vt.template_height,
                       vt.print_area_width,
                       vt.print_area_height,
                       vt.print_area_top,
                       vt.print_area_left,
			vprint.technique,
			vprint.placement
		FROM {$prefix}variants v
		LEFT JOIN {$prefix}variant_prices vp ON vp.variant_id = v.variant_id
		LEFT JOIN {$prefix}variant_stock vs ON vs.variant_id = v.variant_id
		LEFT JOIN {$prefix}variant_mockup vm ON vm.variant_id = v.variant_id
		LEFT JOIN {$prefix}variant_templates vt ON vt.variant_id = v.variant_id
                LEFT JOIN {$prefix}variant_print vprint ON vprint.variant_id = v.variant_id
                WHERE v.product_id = %d
        ";

	$results = $wpdb->get_results($wpdb->prepare($query, $product_id), ARRAY_A);

	if (empty($results)) {
		return new WP_REST_Response(['success' => false, 'message' => 'Aucune variante trouvée'], 404);
	}

	$grouped = [];

	foreach ($results as $v) {
		$vid = (int)$v['variant_id'];

		if (!isset($grouped[$vid])) {
			$grouped[$vid] = [
				'variant_id' => $vid,
				'color' => $v['color'],
				'size' => $v['size'],
				'ratio_image' => $v['ratio_image'],
				'price' => $v['price'] ? floatval($v['price']) : null,
				'sale_price' => $v['sale_price'] ? floatval($v['sale_price']) : null,
				'custom_margin' => $v['custom_margin'] !== null ? floatval($v['custom_margin']) : null,
				'delivery_time' => $v['delivery_time'],
				'delivery_price' => $v['delivery_price'] ? floatval($v['delivery_price']) : null,
                                'mockup' => [
                                        'image' => $v['mockup_image'],
                                        'top' => $v['position_top'],
                                        'left' => $v['position_left'],
                                        'view_name' => $v['view_name']
                                ],
                               'template' => [
                                       'image' => $v['template_image'],
                                       'image_path' => $v['template_image_path'],
                                       'width' => $v['template_width'],
                                       'height' => $v['template_height'],
                                       'print_area' => [
                                               'width' => $v['print_area_width'],
                                               'height' => $v['print_area_height'],
                                               'top' => $v['print_area_top'],
                                               'left' => $v['print_area_left']
                                       ]
                               ],
				'print' => [
					'technique' => $v['technique'],
					'placement' => $v['placement']
				],
				'stock_by_region' => []
			];
		}

		if (!empty($v['region']) && !empty($v['availability'])) {
			$grouped[$vid]['stock_by_region'][$v['region']] = $v['availability'];
		}
	}

	return new WP_REST_Response(array_values($grouped), 200);
}
