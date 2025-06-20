<?php
require_once __DIR__ . '/../../includes/printful_rate_limit.php';
register_rest_route('api/v1/products', '/update/stocks', [
	'methods' => 'POST',
	'callback' => 'customiizer_update_all_variant_stocks',
	'permission_callback' => '__return_true',
]);

function customiizer_update_all_variant_stocks() {
	global $wpdb;

	if (!defined('PRINTFUL_API_KEY')) {
		return new WP_REST_Response(['success' => false, 'message' => 'Clé API Printful manquante'], 500);
	}

	$prefix = 'WPC_';
	$variant_ids = $wpdb->get_col("SELECT variant_id FROM {$prefix}variants");
	$token = PRINTFUL_API_KEY;
	$base  = defined('PRINTFUL_API_BASE') ? PRINTFUL_API_BASE : 'https://api.printful.com/v2';
	$hdr   = [ 'Authorization' => "Bearer $token" ];
	$regions = ['france']; // Ajoute ici les régions que tu veux interroger

	$total_updates = 0;
	$errors = [];

	foreach ($variant_ids as $vid) {
                foreach ($regions as $region) {
                        $stock_url = "$base/catalog-variants/$vid/availability?selling_region_name=" . urlencode($region);

                        $response = printful_request(function () use ($stock_url, $hdr) {
                                return wp_remote_get($stock_url, [
                                        'headers' => $hdr,
                                        'timeout' => 10,
                                ]);
                        });

			if (is_wp_error($response)) {
				$errors[] = "Erreur WP pour $vid-$region : " . $response->get_error_message();
				continue;
			}

			$body = wp_remote_retrieve_body($response);
			$data = json_decode($body, true);

			$availability = $data['data']['techniques'][0]['selling_regions'][0]['availability'] ?? null;

			if (!$availability) {
				$availability = 'out of stock';
				$errors[] = "Aucune dispo pour $vid-$region → forcé 'out of stock'";
			}

			// Insert or update
			$wpdb->query($wpdb->prepare("
				INSERT INTO {$prefix}variant_stock (variant_id, region, availability)
				VALUES (%d, %s, %s)
				ON DUPLICATE KEY UPDATE availability = VALUES(availability)
			", $vid, $region, $availability));

			$total_updates++;
		}
	}

	return new WP_REST_Response([
		'success' => true,
		'updated' => $total_updates,
		'errors' => $errors
	], 200);
}