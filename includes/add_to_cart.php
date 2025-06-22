<?php
/**
 * AJAX handler pour création produit avec mockup en thumbnail et design en métadonnées
 */
function custom_add_to_cart() {
	// Log: début de l'action

	// Récupération des données POST
	$product_name       = isset($_POST['product_name'])       ? sanitize_text_field($_POST['product_name'])       : 'Produit Personnalisé ' . time();
	$variant_id = isset($_POST['variant_id']) ? intval($_POST['variant_id']) : 0;
	$price              = isset($_POST['price'])              ? floatval($_POST['price'])                         : 0;
	$quantity           = isset($_POST['quantity'])           ? intval($_POST['quantity'])                        : 1;
	// URL du mockup à utiliser comme vignette
	$mockup_image_url   = isset($_POST['mockup_image_url'])   ? esc_url_raw($_POST['mockup_image_url'])           : '';
	// URL et position du design à appliquer sur le mockup
	$placement = isset($_POST['placement']) ? sanitize_text_field($_POST['placement']) : 'default';
	$technique = isset($_POST['technique']) ? sanitize_text_field($_POST['technique']) : 'digital';

	$design_image_url   = isset($_POST['design_image_url'])   ? esc_url_raw($_POST['design_image_url'])           : '';
	$design_width_in    = isset($_POST['width'])              ? floatval($_POST['width'])                         : 0;
	$design_height_in   = isset($_POST['height'])             ? floatval($_POST['height'])                        : 0;
	$design_left_in     = isset($_POST['left'])               ? floatval($_POST['left'])                          : 0;
	$design_top_in      = isset($_POST['top'])                ? floatval($_POST['top'])                           : 0;


	// Création du produit WooCommerce temporaire
	$post_id = wp_insert_post([
		'post_title'   => $product_name,
		'post_type'    => 'product',
		'post_status'  => 'publish',
		'meta_input'   => [
			'_virtual'        => 'yes',
			'_regular_price'  => $price,
			'_price'          => $price,
			'_visibility'     => 'hidden',
			'_stock_status'   => 'instock',
			'_manage_stock'   => 'no',
		],
	]);
	if (is_wp_error($post_id) || ! $post_id) {
		wp_send_json_error('Échec de création du produit.');
	}

	// Attacher l'image mockup comme vignette si fournie
	if ($mockup_image_url) {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$tmp_file = download_url($mockup_image_url);
		if (!is_wp_error($tmp_file)) {
			$file_array = [
				'name'     => basename($mockup_image_url),
				'tmp_name' => $tmp_file,
			];
			$attach_id = media_handle_sideload($file_array, $post_id);
			if (!is_wp_error($attach_id)) {
				set_post_thumbnail($post_id, $attach_id);
			} else {
				@unlink($tmp_file);
			}
		} else {
		}
	}

	// Préparation des métadonnées de design (image & position)
	$cart_item_data = [];
	if ($design_image_url) {
		$cart_item_data = [
			'variant_id'       => $variant_id,
			'design_image_url' => $design_image_url,
			'design_width'     => $design_width_in,
			'design_height'    => $design_height_in,
			'design_left'      => $design_left_in,
			'design_top'       => $design_top_in,
			'placement'        => $placement,
			'technique'        => $technique
		];
	}

	// Ajout au panier du produit temporaire avec metas si existantes
	$cart_item_key = WC()->cart->add_to_cart($post_id, $quantity, 0, [], $cart_item_data);
	if ($cart_item_key) {
		wp_send_json_success(['cart_item_key' => $cart_item_key]);
	} else {
		$errors = WC()->cart->get_errors();
		if (!empty($errors)) {
		}
		wp_send_json_error('Échec de l’ajout au panier.');
	}
}
add_action('wp_ajax_nopriv_custom_add_to_cart', 'custom_add_to_cart');
add_action('wp_ajax_custom_add_to_cart',    'custom_add_to_cart');

function customiizer_transfer_cart_item_meta($item, $cart_item_key, $values, $order) {
	$meta_keys = [
		'variant_id',
		'design_image_url',
		'design_width',
		'design_height',
		'design_left',
		'design_top',
		'placement',
		'technique'
	];

	foreach ($meta_keys as $key) {
		if (isset($values[$key])) {
			$item->add_meta_data($key, $values[$key]);
		}
	}
}
add_action('woocommerce_checkout_create_order_line_item', 'customiizer_transfer_cart_item_meta', 10, 4);
?>
