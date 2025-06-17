<?php

function customiizer_generate_product() {
	if (empty($_POST['product_data'])) {
		wp_send_json_error('Données produit manquantes');
	}

	$data = json_decode(stripslashes($_POST['product_data']), true);
	if (!$data) {
		wp_send_json_error('Format JSON invalide');
	}
	customiizer_log('📦 [AJAX] Données reçues pour création produit : ' . json_encode($data));
	// Nettoyage des données
	$product_name = sanitize_text_field($data['product_name'] ?? 'Produit personnalisé ' . current_time('d/m/Y H:i'));
	$product_price = floatval($data['product_price'] ?? 0);
	$mockup_url = esc_url_raw($data['mockup_url'] ?? '');

	// Création du produit
	$product = new WC_Product_Simple();
	$product->set_name($product_name);
	$product->set_status('publish');
	$product->set_catalog_visibility('hidden');
	$product->set_price($product_price);
	$product->set_regular_price($product_price);
	$product->set_manage_stock(false);
	$product->set_sku('TMP-' . current_time('YmdHis') . '-' . wp_generate_password(6, false));
	$product->save();

	$product_id = $product->get_id();

	// Sauvegarde les meta indispensables
	update_post_meta($product_id, 'custom_shipping_cost', floatval($data['delivery_price'] ?? 0));
	update_post_meta($product_id, 'design_image_url', sanitize_text_field($data['design_image_url'] ?? ''));
	update_post_meta($product_id, 'design_width', floatval($data['design_width'] ?? 0));
	update_post_meta($product_id, 'design_height', floatval($data['design_height'] ?? 0));
	update_post_meta($product_id, 'design_left', floatval($data['design_left'] ?? 0));
	update_post_meta($product_id, 'design_top', floatval($data['design_top'] ?? 0));
	update_post_meta($product_id, 'variant_id', intval($data['variant_id'] ?? 0));
	update_post_meta($product_id, 'placement', sanitize_text_field($data['placement'] ?? ''));
	update_post_meta($product_id, 'technique', sanitize_text_field($data['technique'] ?? ''));

	// Importer et associer l'image mockup comme image produit
	if (!empty($mockup_url)) {
		require_once ABSPATH . 'wp-admin/includes/image.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';

		$attachment_id = media_sideload_image($mockup_url, $product_id, null, 'id');
		if (!is_wp_error($attachment_id)) {
			set_post_thumbnail($product_id, $attachment_id);
		} else {
			error_log('❌ Erreur téléchargement mockup : ' . $attachment_id->get_error_message());
		}
	}

	wp_send_json_success(['product_id' => $product_id]);
}

add_action('wp_ajax_generate_custom_product', 'customiizer_generate_product');
add_action('wp_ajax_nopriv_generate_custom_product', 'customiizer_generate_product');