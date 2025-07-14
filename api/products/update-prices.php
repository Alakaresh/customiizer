<?php

register_rest_route('api/v1/products/update', '/prices', [
	'methods'  => 'POST',
	'callback' => 'customiizer_update_purchase_prices',
        'permission_callback' => 'customiizer_api_permission',
]);
function customiizer_update_purchase_prices() {
	global $wpdb;

	if (!defined('PRINTFUL_API_KEY')) {
		return new WP_REST_Response(['success' => false, 'message' => 'Clé API Printful manquante'], 500);
	}

	$prefix  = 'WPC_';
	$token   = PRINTFUL_API_KEY;
	$base    = defined('PRINTFUL_API_BASE') ? PRINTFUL_API_BASE : 'https://api.printful.com/v2';
	$headers = [ 'Authorization' => "Bearer $token" ];
	$regions = ['france'];

	$variant_ids = $wpdb->get_col("SELECT variant_id FROM {$prefix}variant_prices");
	$total_updates = 0;
	$errors = [];

	foreach ($variant_ids as $vid) {
		foreach ($regions as $region) {
			$url = "$base/catalog-variants/{$vid}/prices?currency=EUR&selling_region_name=" . urlencode($region);

			$response = wp_remote_get($url, [
				'headers' => $headers,
				'timeout' => 15,
			]);

			if (is_wp_error($response)) {
				$errors[] = "Erreur WP pour $vid-$region : " . $response->get_error_message();
				continue;
			}

			$body = wp_remote_retrieve_body($response);
			$data = json_decode($body, true);

			if (empty($data['data']['variant']['techniques'][0]['price'])) {
				$errors[] = "Aucune donnée de prix pour $vid-$region";
				continue;
			}

			$price = floatval($data['data']['variant']['techniques'][0]['price']);

			// Mise à jour SQL
			$res = $wpdb->update("{$prefix}variant_prices", ['price' => $price], ['variant_id' => $vid]);

			if ($res === false) {
				$errors[] = "Échec update SQL pour $vid → $price €";
			} else {
				$total_updates++;
			}
		}
	}

	return new WP_REST_Response([
		'success' => true,
		'updated' => $total_updates,
		'errors'  => $errors
	], 200);
}
