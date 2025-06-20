<?php
/**
 * AJAX handler pour création produit avec mockup en thumbnail et design en métadonnées
 */
function custom_add_to_cart() {
	// Log: début de l'action
	customiizer_log("🔧 custom_add_to_cart déclenché : création produit avec mockup & design");

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

	customiizer_log("📥 Données reçues : name={$product_name}, price={$price}, qty={$quantity}");
	customiizer_log("   Mockup URL: " . ($mockup_image_url?:'aucune'));
	customiizer_log("   Design URL: " . ($design_image_url?:'aucune'));
	customiizer_log("   Position design: w={$design_width_in}, h={$design_height_in}, left={$design_left_in}, top={$design_top_in}");

        // Utilisation d'un produit modèle existant
        $post_id = isset($_POST['template_product_id'])
                ? intval($_POST['template_product_id'])
                : (defined('CUSTOM_TEMPLATE_PRODUCT_ID') ? (int)CUSTOM_TEMPLATE_PRODUCT_ID : 0);
        if (!$post_id) {
                customiizer_log("❌ ID produit modèle manquant");
                wp_send_json_error('Produit modèle introuvable.');
        }
        customiizer_log("✅ Produit modèle ID={$post_id}");

        // Pas de récupération d'image, le mockup est stocké via cart_item_data

        // Préparation des métadonnées de personnalisation
        $cart_item_data = [
                'mockup_image_url' => $mockup_image_url,
                'variant_id'       => $variant_id,
                'placement'        => $placement,
                'technique'        => $technique,
        ];
        if ($design_image_url) {
                $cart_item_data += [
                        'design_image_url' => $design_image_url,
                        'design_width'     => $design_width_in,
                        'design_height'    => $design_height_in,
                        'design_left'      => $design_left_in,
                        'design_top'       => $design_top_in,
                ];
        }
        customiizer_log("🛒 Metadata design pour add_to_cart: " . json_encode($cart_item_data));

	// Ajout au panier du produit temporaire avec metas si existantes
	$cart_item_key = WC()->cart->add_to_cart($post_id, $quantity, 0, [], $cart_item_data);
	if ($cart_item_key) {
		customiizer_log("✅ Ajout au panier, key={$cart_item_key}");
		wp_send_json_success(['cart_item_key' => $cart_item_key]);
	} else {
		$errors = WC()->cart->get_errors();
		if (!empty($errors)) {
			customiizer_log("⚠️ Erreurs cart : " . json_encode($errors));
		}
		wp_send_json_error('Échec de l’ajout au panier.');
	}
}
add_action('wp_ajax_nopriv_custom_add_to_cart', 'custom_add_to_cart');
add_action('wp_ajax_custom_add_to_cart',    'custom_add_to_cart');

function customiizer_transfer_cart_item_meta($item, $cart_item_key, $values, $order) {
        $meta_keys = [
                'mockup_image_url',
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
