<?php
register_rest_route('api/v1/products', '/variant/(?P<variant_id>\d+)/margin', [
	'methods' => 'POST',
	'callback' => 'set_custom_variant_margin',
	'permission_callback' => 'customiizer_api_permissions',
]);

function set_custom_variant_margin(WP_REST_Request $req) {
	global $wpdb;

	$vid = (int) $req['variant_id'];
	$params = $req->get_json_params();
	$margin = isset($params['custom_margin']) ? $params['custom_margin'] : null;

	if (!is_numeric($margin) && $margin !== null) {
		return new WP_REST_Response(['success' => false, 'message' => 'Marge invalide'], 400);
	}

	$margin = $margin !== null ? floatval($margin) : null;

	// 🔍 Récupérer le prix de base
	$price = $wpdb->get_var($wpdb->prepare(
		"SELECT price FROM WPC_variant_prices WHERE variant_id = %d", $vid
	));

	if ($price === null || $price <= 0) {
		return new WP_REST_Response(['success' => false, 'message' => 'Prix introuvable'], 404);
	}

	// 💰 Calcul du nouveau prix de vente
	$default_margin = 0.3;
	$effective_margin = ($margin ?? $default_margin) / 100;

	$sale_price = round($price * (1 + $effective_margin), 2);

	// 💾 Mise à jour
	$wpdb->update('WPC_variant_prices', [
		'custom_margin' => $margin,
		'sale_price'     => $sale_price,
	], ['variant_id' => $vid]);

	return new WP_REST_Response([
		'success' => true,
		'sale_price' => $sale_price,
		'margin_applied' => $effective_margin,
	], 200);
}