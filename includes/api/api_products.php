<?php
add_action('rest_api_init', function() {
	// Enregistrer la route pour récupérer les produits avec l'image, le nom et le prix le plus bas
	register_rest_route('custom-api/v1', '/products-summary/', array(
		'methods' => 'GET',
		'callback' => 'get_products_summary',
		 'permission_callback' => '__return_true',
	));

	register_rest_route('custom-api/v1', '/products/', array(
		'methods' => 'GET',
		'callback' => 'get_products_with_images_only',
		 'permission_callback' => '__return_true',
	));
	register_rest_route('custom-api/v1', '/product-variants/(?P<id>\d+)', [
		'methods' => 'GET',
		'callback' => 'get_product_variants',
		'permission_callback' => '__return_true'
	]);
});

/**
 * Fonction pour récupérer les produits avec l'image de la première variante, le nom et le prix le plus bas
 */
function get_products_summary() {
	global $wpdb;
	customiizer_log('Appel API : get_products_summary()');
	// Utiliser explicitement le préfixe personnalisé WPC_
	$prefix = 'WPC_';  // Préfixe personnalisé

	// Requête SQL pour récupérer les produits, variantes et prix
	$query = "
    SELECT 
        p.product_id, 
        p.name, 
        v.variant_id, 
        vp.price,
        vm.image AS image
    FROM 
        {$prefix}products AS p
    LEFT JOIN 
        {$prefix}variants AS v ON p.product_id = v.product_id
    LEFT JOIN 
        {$prefix}variant_prices AS vp ON vp.variant_id = v.variant_id
    LEFT JOIN
        {$prefix}variant_mockup AS vm ON vm.variant_id = v.variant_id
    ";

	// Exécution de la requête
	$results = $wpdb->get_results($query, ARRAY_A);
	customiizer_log('Résultats produits : ' . count($results));
	// Si aucune donnée n'est trouvée
	if (empty($results)) {
		customiizer_log('Aucun produit trouvé dans get_products_summary');
		return new WP_REST_Response('Aucun produit trouvé', 404);
	}

	// Organiser les résultats par produit
	$products = [];

	foreach ($results as $row) {
		$product_id = $row['product_id'];

		// Si le produit n'existe pas encore dans l'array, on l'ajoute
		if (!isset($products[$product_id])) {
			$products[$product_id] = [
				'product_id' => $row['product_id'],
				'name' => $row['name'],
				'image' => $row['image'],  // Correction ici
				'variants' => [],
				'lowest_price' => $row['price'], // Initialisation avec le prix de la première variante
			];
		}

		// Ajouter la variante au produit
		$products[$product_id]['variants'][] = [
			'variant_id' => $row['variant_id'],
			'price' => $row['price'],
			'image' => $row['image']
		];

		// Mettre à jour le prix le plus bas si nécessaire
		if ($row['price'] < $products[$product_id]['lowest_price']) {
			$products[$product_id]['lowest_price'] = $row['price'];
		}
	}

	// Retourner les données structurées en JSON
	return new WP_REST_Response(array_values($products), 200);
}

function get_products_with_images_only() {
	global $wpdb;

	// Utiliser explicitement le préfixe personnalisé WPC_
	$prefix = 'WPC_';  // Préfixe personnalisé

	// Requête pour récupérer les produits et les informations sur les variantes, y compris l'image
	$query = "
    SELECT 
        p.product_id, 
        p.name,
        vm.image AS image
    FROM 
        {$prefix}products AS p
    LEFT JOIN 
        {$prefix}variants AS v ON p.product_id = v.product_id
    LEFT JOIN 
        {$prefix}variant_mockup AS vm ON vm.variant_id = v.variant_id
    ";

	// Exécution de la requête
	$results = $wpdb->get_results($query, ARRAY_A);

	// Si aucune donnée n'est trouvée
	if (empty($results)) {
		return new WP_REST_Response('Aucun produit trouvé', 404);
	}

	// Organiser les résultats pour que les variantes et images soient regroupées sous chaque produit
	$products = [];

	foreach ($results as $row) {
		$product_id = $row['product_id'];

		// Si le produit n'existe pas encore dans l'array, on l'ajoute
		if (!isset($products[$product_id])) {
			$products[$product_id] = [
				'product_id' => $row['product_id'],
				'name' => $row['name'],
				'image' => $row['image'], // Correction : récupération de l'image depuis `WPC_variant_mockup`
			];
		}
	}

	// Retourner les données structurées en JSON
	return new WP_REST_Response(array_values($products), 200);
}

function get_product_variants($request) {
	global $wpdb;

	$product_id = intval($request['id']);
	$prefix = 'WPC_'; // Préfixe des tables

	// Requête SQL avec ajout de url_3d
	$query = $wpdb->prepare("
    SELECT 
        v.variant_id, v.color, v.size, v.ratio_image, v.url_3d, v.zone_3d_name,
        vp.sale_price, vp.delivery_price, vp.delivery_time, vp.stock,
        pr.technique, pr.print_area_width, pr.print_area_height, pr.placement,
        vm.mockup_id, vm.image AS mockup_image, vm.position_top, vm.position_left,
        p.description AS product_description
    FROM {$prefix}variants AS v
    LEFT JOIN {$prefix}variant_prices AS vp ON vp.variant_id = v.variant_id
    LEFT JOIN {$prefix}variant_print AS pr ON pr.variant_id = v.variant_id
    LEFT JOIN {$prefix}variant_mockup AS vm ON vm.variant_id = v.variant_id
    LEFT JOIN {$prefix}products AS p ON p.product_id = v.product_id
    WHERE v.product_id = %d
    ORDER BY v.size ASC, v.variant_id ASC, vm.mockup_id ASC
", $product_id);


	$results = $wpdb->get_results($query, ARRAY_A);

	if (empty($results)) {
		return new WP_REST_Response(['error' => 'Aucune variante trouvée pour ce produit.'], 404);
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
				'stock' => intval($row['stock']),
				'technique' => $row['technique'],
				'print_area_width' => floatval($row['print_area_width']),
				'print_area_height' => floatval($row['print_area_height']),
				'placement' => $row['placement'],
				'mockups' => []
			];
		}

		if (!empty($row['mockup_id'])) {
			$variants[$variant_id]['mockups'][] = [
				'mockup_id' => $row['mockup_id'],
				'mockup_image' => $row['mockup_image'],
				'position_top' => $row['position_top'],
				'position_left' => $row['position_left']
			];
		}
	}

	return new WP_REST_Response([
		'product_description' => $productDescription,
		'variants' => array_values($variants)
	], 200);
}
