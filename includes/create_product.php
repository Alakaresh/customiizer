<?php

function customiizer_generate_product() {
        if (empty($_POST['product_data'])) {
                customiizer_log('❌ create_product : données manquantes');
                wp_send_json_error('Données produit manquantes');
        }

        $data = json_decode(stripslashes($_POST['product_data']), true);
        if (!$data) {
                customiizer_log('❌ create_product : JSON invalide');
                wp_send_json_error('Format JSON invalide');
        }
        // Nettoyage des données
        $product_name = sanitize_text_field($data['product_name'] ?? 'Produit personnalisé ' . current_time('d/m/Y H:i'));
        $product_price = floatval($data['product_price'] ?? 0);
        $mockup_url = esc_url_raw($data['mockup_url'] ?? '');

        $variant_id = intval($data['variant_id'] ?? 0);

        $normalize_field = static function ($value, $fallback_key = null) {
                if (is_object($value)) {
                        $value = (array) $value;
                }
                if (is_array($value)) {
                        if ($fallback_key && isset($value[$fallback_key])) {
                                $value = $value[$fallback_key];
                        } elseif (isset($value['value'])) {
                                $value = $value['value'];
                        } elseif (isset($value[0]) && !is_array($value[0]) && !is_object($value[0])) {
                                $value = $value[0];
                        } else {
                                $value = '';
                        }
                }
                return sanitize_text_field($value ?? '');
        };

        $placement = $normalize_field($data['placement'] ?? '', 'placement');
        $technique = $normalize_field($data['technique'] ?? '', 'technique');

        if ($variant_id && (!$placement || !$technique)) {
                global $wpdb;
                $row = $wpdb->get_row(
                        $wpdb->prepare(
                                'SELECT technique, placement FROM WPC_variant_print WHERE variant_id = %d LIMIT 1',
                                $variant_id
                        ),
                        ARRAY_A
                );

                if ($row) {
                        if (!$placement && !empty($row['placement'])) {
                                $placement = sanitize_text_field($row['placement']);
                        }
                        if (!$technique && !empty($row['technique'])) {
                                $technique = sanitize_text_field($row['technique']);
                        }
                }
        }

        customiizer_log("➡️ create_product : {$product_name} ({$product_price}€)");

        // Provide a fallback image if none supplied
        if (empty($mockup_url)) {
                $mockup_url = get_stylesheet_directory_uri() . '/images/products/empty.png';
        }

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
        customiizer_log("✅ produit créé ID={$product_id}");

	// Sauvegarde les meta indispensables
	update_post_meta($product_id, 'custom_shipping_cost', floatval($data['delivery_price'] ?? 0));
	update_post_meta($product_id, 'design_image_url', sanitize_text_field($data['design_image_url'] ?? ''));
	update_post_meta($product_id, 'design_width', floatval($data['design_width'] ?? 0));
	update_post_meta($product_id, 'design_height', floatval($data['design_height'] ?? 0));
	update_post_meta($product_id, 'design_left', floatval($data['design_left'] ?? 0));
	update_post_meta($product_id, 'design_top', floatval($data['design_top'] ?? 0));
        update_post_meta($product_id, 'variant_id', $variant_id);
        update_post_meta($product_id, 'placement', $placement);
        update_post_meta($product_id, 'technique', $technique);

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

        customiizer_log("🛒 produit $product_id prêt, renvoi JSON");
        wp_send_json_success(['product_id' => $product_id]);
}

add_action('wp_ajax_generate_custom_product', 'customiizer_generate_product');
add_action('wp_ajax_nopriv_generate_custom_product', 'customiizer_generate_product');