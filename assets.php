<?php
/**
 * Chargement conditionnel des assets CSS/JS selon l'URL pour le template Customize
 */

add_action('wp_enqueue_scripts', 'customiizer_enqueue_customize_assets', 20);

function customiizer_enqueue_customize_assets() {
	$request_uri = $_SERVER['REQUEST_URI'];

	// NONCES pour les formulaires de connexion et d'inscription
	$signin_nonce = wp_create_nonce('signin_nonce');
	$signup_nonce = wp_create_nonce('signup_nonce');

	// ===============================
	// STYLES GLOBAUX
	// ===============================
	wp_enqueue_style('parent-style', get_template_directory_uri().'/style.css');
	wp_enqueue_style('child-style', get_stylesheet_directory_uri().'/style.css', array('parent-style'));
	wp_enqueue_style('customiizer-style', get_stylesheet_directory_uri() . '/styles/style.css');
	wp_enqueue_style('preview-image-style', get_stylesheet_directory_uri() . '/styles/preview_image.css');
	wp_enqueue_style('customize-style', get_stylesheet_directory_uri() . '/styles/customize.css');
	wp_enqueue_style('header-style', get_stylesheet_directory_uri() . '/styles/header.css');
	wp_enqueue_style('footer-style', get_stylesheet_directory_uri() . '/styles/footer.css');

	// ===============================
	// SCRIPTS GLOBAUX
	// ===============================
        wp_enqueue_script('preview_image-js', get_stylesheet_directory_uri() . '/js/preview_image.js', array(), null, true);
        wp_enqueue_script('signin-script', get_stylesheet_directory_uri() . '/js/account/signin.js', array('jquery'), null, true);
        wp_enqueue_script('signup-script', get_stylesheet_directory_uri() . '/js/account/signup.js', array('jquery'), null, true);
        wp_enqueue_script('preload-products', get_stylesheet_directory_uri() . '/js/preload_products.js', array(), null, true);

        // Mark the preload-products script as async on all pages except the shop
        add_filter('script_loader_tag', function($tag, $handle) {
                $request_uri = $_SERVER['REQUEST_URI'] ?? '';
                if ('preload-products' === $handle && strpos($request_uri, '/boutique') === false) {
                        return str_replace(' src', ' async src', $tag);
                }
                return $tag;
        }, 10, 2);

	// Localiser les scripts avec leurs NONCES
	wp_localize_script('signin-script', 'signin_object', array('nonce' => $signin_nonce));
	wp_localize_script('signup-script', 'signup_object', array('nonce' => $signup_nonce));

	// ===============================
	// STYLES & SCRIPTS PAR PAGE
	// ===============================

	// Page /generate
       if (is_front_page() || is_page('home')) {
               // --- CSS ---
               wp_enqueue_style('home-style', get_stylesheet_directory_uri() . '/styles/home.css');

		// --- JS internes ---
		wp_enqueue_script('home-products', get_stylesheet_directory_uri() . '/js/home/products.js', ['jquery'], null, true);
		wp_enqueue_script('home-carousel', get_stylesheet_directory_uri() . '/js/home/carrousel.js', ['jquery'], null, true);
	} elseif (strpos($request_uri, '/customiize') !== false) {
		// --- CSS ---
		wp_enqueue_style('driver-style', 'https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.css');
		wp_enqueue_style('generate-style', get_stylesheet_directory_uri() . '/styles/generate.css');

		// --- JS externes ---
		wp_enqueue_script('driver-js', 'https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.js.iife.js', [], null, true);

		// --- JS internes ---
		wp_enqueue_script('generate-ratio', get_stylesheet_directory_uri() . '/js/generate/show_ratio.js', ['jquery'], null, true);
		wp_enqueue_script('generate-images', get_stylesheet_directory_uri() . '/js/generate/show_images.js', ['jquery'], null, true);
		wp_enqueue_script('generate-main', get_stylesheet_directory_uri() . '/js/generate/generate.js', ['jquery'], null, true);
		wp_enqueue_script('generate-screen', get_stylesheet_directory_uri() . '/js/generate/screen.js', ['jquery'], null, true);
		wp_enqueue_script('generate-tutorial', get_stylesheet_directory_uri() . '/js/generate/tutorial.js', ['jquery'], null, true);

		// Page /shop
	} elseif (strpos($request_uri, '/boutique') !== false) {
		// --- CSS ---
		wp_enqueue_style('shop-style', get_stylesheet_directory_uri() . '/styles/shop.css');

		// --- JS internes ---
		wp_enqueue_script('shop-script', get_stylesheet_directory_uri() . '/js/shop/shop.js', ['jquery'], null, true);

		// Page /product
	} elseif (strpos($request_uri, '/configurateur') !== false) {
		// --- CSS ---
		wp_enqueue_style('product-style', get_stylesheet_directory_uri() . '/styles/product.css');
		wp_enqueue_style('design-style', get_stylesheet_directory_uri() . '/styles/design_product.css');

		// --- JS externes (Three.js & Fabric) ---
		wp_enqueue_script('fabric-js', 'https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js', [], null, true);
		wp_enqueue_script('three-js', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', array(), null, true);
		wp_enqueue_script('gltf-loader', get_stylesheet_directory_uri() . '/assets/GLTFLoader.js', array('three-js'), null, true);
		wp_enqueue_script('orbit-controls', get_stylesheet_directory_uri() . '/assets/OrbitControls.js', array('three-js'), null, true);

		// --- JS internes ---
		wp_enqueue_script('product-dropdown', get_stylesheet_directory_uri() . '/js/product/product_dropdown.js', ['jquery'], null, true);
		wp_enqueue_script('product-custom', get_stylesheet_directory_uri() . '/js/product/product_customize.js', ['jquery'], null, true);
		wp_enqueue_script('product-details', get_stylesheet_directory_uri() . '/js/product/product_details.js', ['jquery'], null, true);
		wp_enqueue_script('product-3d', get_stylesheet_directory_uri() . '/js/product/threeDManager.js', ['jquery'], null, true);
		wp_enqueue_script('product-images', get_stylesheet_directory_uri() . '/js/product/product_images.js', ['jquery'], null, true);

		wp_enqueue_script('product-canvas', get_stylesheet_directory_uri() . '/js/product/canvasManager.js', ['jquery'], null, true);
		wp_enqueue_script('product-cart', get_stylesheet_directory_uri() . '/js/product/product_add_to_cart.js', ['jquery'], null, true);
                wp_enqueue_script('product-imageManager', get_stylesheet_directory_uri() . '/js/product/imageManager.js', ['jquery'], null, true);

                if (get_option('customiizer_position_editor')) {
                        wp_enqueue_script('position-editor', get_stylesheet_directory_uri() . '/js/product/position_editor.js', ['jquery'], null, true);
                }


		// Page /community
	} elseif (strpos($request_uri, '/communaute') !== false) {
		// --- CSS ---
		wp_enqueue_style('community-style', get_stylesheet_directory_uri() . '/styles/community.css');

		// --- JS internes ---
		wp_enqueue_script('community-images', get_stylesheet_directory_uri() . '/js/community/show_images.js', ['jquery'], null, true);

		// Page /mycreation
       } elseif (strpos($request_uri, '/mycreation') !== false) {
               // --- CSS ---
               wp_enqueue_style('mycreation-style', get_stylesheet_directory_uri() . '/styles/mycreation.css');

                // --- JS internes ---
                wp_enqueue_script('mycreation-images', get_stylesheet_directory_uri() . '/js/mycreation/show_images.js', ['jquery'], null, true);
       } elseif (
               strpos($request_uri, '/mentions-legales') !== false ||
               strpos($request_uri, '/conditions') !== false ||
               strpos($request_uri, '/confidentialite') !== false ||
               strpos($request_uri, '/retours') !== false ||
               strpos($request_uri, '/cookies') !== false
       ) {
               // --- CSS ---
               wp_enqueue_style('legal-global', get_stylesheet_directory_uri() . '/styles/legal-global.css');
       }

        // --- Responsive CSS ---
        wp_enqueue_style('responsive-tablet', get_stylesheet_directory_uri() . '/styles/responsive/tablet.css', [], null, 'all');
        wp_enqueue_style('tablet-base', get_stylesheet_directory_uri() . '/styles/responsive/tablet/base.css', [], null, 'all');
        wp_enqueue_style('mobile-base', get_stylesheet_directory_uri() . '/styles/responsive/mobile/base.css', [], null, 'all');

       if (is_front_page() || is_page('home')) {
               wp_enqueue_style('tablet-home', get_stylesheet_directory_uri() . '/styles/responsive/tablet/home.css', [], null, 'all');
               wp_enqueue_style('mobile-home', get_stylesheet_directory_uri() . '/styles/responsive/mobile/home.css', [], null, 'all');
       } elseif (strpos($request_uri, '/customiize') !== false) {
               wp_enqueue_style('tablet-customize', get_stylesheet_directory_uri() . '/styles/responsive/tablet/customize.css', [], null, 'all');
               wp_enqueue_style('mobile-customize', get_stylesheet_directory_uri() . '/styles/responsive/mobile/customize.css', [], null, 'all');
       } elseif (strpos($request_uri, '/configurateur') !== false) {
               wp_enqueue_style('tablet-product', get_stylesheet_directory_uri() . '/styles/responsive/tablet/product.css', [], null, 'all');
               wp_enqueue_style('tablet-design-product', get_stylesheet_directory_uri() . '/styles/responsive/tablet/design_product.css', [], null, 'all');
               wp_enqueue_style('mobile-product', get_stylesheet_directory_uri() . '/styles/responsive/mobile/product.css', [], null, 'all');
               wp_enqueue_style('mobile-design-product', get_stylesheet_directory_uri() . '/styles/responsive/mobile/design_product.css', [], null, 'all');
       } elseif (strpos($request_uri, '/communaute') !== false) {
               wp_enqueue_style('tablet-community', get_stylesheet_directory_uri() . '/styles/responsive/tablet/community.css', [], null, 'all');
               wp_enqueue_style('mobile-community', get_stylesheet_directory_uri() . '/styles/responsive/mobile/community.css', [], null, 'all');
       } elseif (strpos($request_uri, '/mycreation') !== false) {
               wp_enqueue_style('tablet-mycreation', get_stylesheet_directory_uri() . '/styles/responsive/tablet/mycreation.css', [], null, 'all');
               wp_enqueue_style('mobile-mycreation', get_stylesheet_directory_uri() . '/styles/responsive/mobile/mycreation.css', [], null, 'all');
       } elseif (
               strpos($request_uri, '/mentions-legales') !== false ||
               strpos($request_uri, '/conditions') !== false ||
               strpos($request_uri, '/confidentialite') !== false ||
               strpos($request_uri, '/retours') !== false ||
               strpos($request_uri, '/cookies') !== false
       ) {
               wp_enqueue_style('tablet-legal', get_stylesheet_directory_uri() . '/styles/responsive/tablet/legal.css', [], null, 'all');
               wp_enqueue_style('mobile-legal', get_stylesheet_directory_uri() . '/styles/responsive/mobile/legal.css', [], null, 'all');
       }
}
