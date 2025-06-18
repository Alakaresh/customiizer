<?php
register_rest_route('api/v1/products', '/(?P<product_id>\d+)/margin', [
	'methods' => 'POST',
	'callback' => 'set_margin_for_all_variants',
	'permission_callback' => 'customiizer_api_permissions',
]);

function set_margin_for_all_variants(WP_REST_Request $req) {
	global $wpdb;

	$product_id = (int) $req['product_id'];
	$margin = floatval($req->get_json_params()['custom_margin'] ?? null);

	if ($margin < 0 || $margin > 500) {
		return new WP_REST_Response(['success' => false, 'message' => 'Marge invalide'], 400);
	}

	$variants = $wpdb->get_results($wpdb->prepare(
		"SELECT vp.variant_id, vp.price
	 FROM WPC_variant_prices vp
	 JOIN WPC_variants v ON v.variant_id = vp.variant_id
	 WHERE v.product_id = %d", $product_id
	), ARRAY_A);


	$updated = 0;
	foreach ($variants as $row) {
		$vid = (int) $row['variant_id'];
		$price = floatval($row['price']);
		$sale_price = round($price * (1 + $margin / 100), 2);

		error_log("🔧 Update variant $vid — price=$price — sale_price=$sale_price — margin=$margin");

		$wpdb->update('WPC_variant_prices', [
			'custom_margin' => $margin,
			'sale_price'     => $sale_price,
		], ['variant_id' => $vid]);

		if ($wpdb->last_error) {
			error_log("❌ SQL error variant $vid: " . $wpdb->last_error);
		} else {
			error_log("✅ OK variant $vid");
			$updated++;
		}
	}


	return new WP_REST_Response([
		'success' => true,
		'updated' => $updated,
		'message' => "$updated variantes mises à jour avec $margin%",
	], 200);
}