<?php
/**
 * Chargement conditionnel des assets CSS/JS selon l'URL pour le template Customize
 */

add_action('wp_enqueue_scripts', 'customiizer_enqueue_customize_assets', 20);

function customiizer_enqueue_customize_assets() {
        $request_uri = $_SERVER['REQUEST_URI'];

        // Retrieve version for cache busting
        $ver = customiizer_frontend_version();

        // NONCES pour les formulaires de connexion et d'inscription
        $signin_nonce = wp_create_nonce('signin_nonce');
        $signup_nonce = wp_create_nonce('signup_nonce');

        // ===============================
        // jQuery & jQuery Migrate
        // ===============================
        wp_deregister_script('jquery');
        wp_register_script(
                'jquery',
                'https://code.jquery.com/jquery-3.7.1.min.js',
                [],
                '3.7.1',
                true
        );

        wp_deregister_script('jquery-migrate');
        wp_register_script(
                'jquery-migrate',
                'https://code.jquery.com/jquery-migrate-3.5.2.min.js',
                ['jquery'],
                '3.5.2',
                true
        );
        wp_enqueue_script('jquery');
        wp_enqueue_script('jquery-migrate');

	// ===============================
	// STYLES GLOBAUX
	// ===============================
        wp_enqueue_style('parent-style', get_template_directory_uri().'/style.css', [], $ver);
        wp_enqueue_style('child-style', get_stylesheet_directory_uri().'/style.css', ['parent-style'], $ver);
        wp_enqueue_style('customiizer-style', get_stylesheet_directory_uri() . '/styles/style.css', [], $ver);
        wp_enqueue_style('preview-image-style', get_stylesheet_directory_uri() . '/styles/preview_image.css', [], $ver);
       wp_enqueue_style('customize-style', get_stylesheet_directory_uri() . '/styles/customize.css', [], $ver);
       wp_enqueue_style('header-style', get_stylesheet_directory_uri() . '/styles/header.css', [], $ver);
       wp_enqueue_style('footer-style', get_stylesheet_directory_uri() . '/styles/footer.css', [], $ver);
       wp_enqueue_style('fontawesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css', [], $ver);
       wp_enqueue_style('modal-login-style', get_stylesheet_directory_uri() . '/styles/modal-login.css', [], $ver);
       wp_enqueue_style('user-modal-style', get_stylesheet_directory_uri() . '/styles/user-modal.css', [], $ver);

	// ===============================
	// SCRIPTS GLOBAUX
	// ===============================
        wp_enqueue_script('preview_image-js', get_stylesheet_directory_uri() . '/js/preview_image.js', [], $ver, true);
        wp_enqueue_script('signin-script', get_stylesheet_directory_uri() . '/js/account/signin.js', ['jquery'], $ver, true);
       wp_enqueue_script('signup-script', get_stylesheet_directory_uri() . '/js/account/signup.js', ['jquery'], $ver, true);
       wp_enqueue_script('sign-modal-script', get_stylesheet_directory_uri() . '/js/account/sign_modal.js', ['jquery'], $ver, true);
       wp_enqueue_script('user-modal-script', get_stylesheet_directory_uri() . '/js/account/user-modal.js', ['jquery'], $ver, true);
       wp_enqueue_script('preload-products', get_stylesheet_directory_uri() . '/js/preload_products.js', [], $ver, true);

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
               wp_enqueue_style('home-style', get_stylesheet_directory_uri() . '/styles/home.css', [], $ver);

		// --- JS internes ---
                wp_enqueue_script('home-products', get_stylesheet_directory_uri() . '/js/home/products.js', ['jquery'], $ver, true);
                wp_enqueue_script('home-carousel', get_stylesheet_directory_uri() . '/js/home/carrousel.js', ['jquery'], $ver, true);
	} elseif (strpos($request_uri, '/customiize') !== false) {
		// --- CSS ---
                wp_enqueue_style('driver-style', 'https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.css', [], $ver);
                wp_enqueue_style('generate-style', get_stylesheet_directory_uri() . '/styles/generate.css', [], $ver);

		// --- JS externes ---
                wp_enqueue_script('driver-js', 'https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.js.iife.js', [], $ver, true);

		// --- JS internes ---
                wp_enqueue_script('generate-ratio', get_stylesheet_directory_uri() . '/js/generate/show_ratio.js', ['jquery'], $ver, true);
                wp_enqueue_script('generate-images', get_stylesheet_directory_uri() . '/js/generate/show_images.js', ['jquery'], $ver, true);
                wp_enqueue_script('generate-main', get_stylesheet_directory_uri() . '/js/generate/generate.js', ['jquery'], $ver, true);
                wp_enqueue_script('generate-screen', get_stylesheet_directory_uri() . '/js/generate/screen.js', ['jquery'], $ver, true);
                wp_enqueue_script('generate-tutorial', get_stylesheet_directory_uri() . '/js/generate/tutorial.js', ['jquery'], $ver, true);

		// Page /shop
	} elseif (strpos($request_uri, '/boutique') !== false) {
		// --- CSS ---
                wp_enqueue_style('shop-style', get_stylesheet_directory_uri() . '/styles/shop.css', [], $ver);

		// --- JS internes ---
                wp_enqueue_script('shop-script', get_stylesheet_directory_uri() . '/js/shop/shop.js', ['jquery'], $ver, true);

		// Page /product
	} elseif (strpos($request_uri, '/configurateur') !== false) {
		// --- CSS ---
                wp_enqueue_style('product-style', get_stylesheet_directory_uri() . '/styles/product.css', [], $ver);
                wp_enqueue_style('design-style', get_stylesheet_directory_uri() . '/styles/design_product.css', [], $ver);

		// --- JS externes (Three.js & Fabric) ---
                wp_enqueue_script('fabric-js', 'https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js', [], $ver, true);
                wp_enqueue_script('three-js', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', [], $ver, true);
                wp_enqueue_script('gltf-loader', get_stylesheet_directory_uri() . '/assets/GLTFLoader.js', ['three-js'], $ver, true);
                wp_enqueue_script('orbit-controls', get_stylesheet_directory_uri() . '/assets/OrbitControls.js', ['three-js'], $ver, true);

		// --- JS internes ---
                wp_enqueue_script('product-dropdown', get_stylesheet_directory_uri() . '/js/product/product_dropdown.js', ['jquery'], $ver, true);
                wp_enqueue_script('product-custom', get_stylesheet_directory_uri() . '/js/product/product_customize.js', ['jquery'], $ver, true);
                wp_enqueue_script('product-details', get_stylesheet_directory_uri() . '/js/product/product_details.js', ['jquery'], $ver, true);
                wp_enqueue_script('product-3d', get_stylesheet_directory_uri() . '/js/product/threeDManager.js', ['jquery'], $ver, true);
                wp_enqueue_script('product-images', get_stylesheet_directory_uri() . '/js/product/product_images.js', ['jquery'], $ver, true);

                wp_enqueue_script('product-canvas', get_stylesheet_directory_uri() . '/js/product/canvasManager.js', ['jquery'], $ver, true);
                wp_enqueue_script('product-cart', get_stylesheet_directory_uri() . '/js/product/product_add_to_cart.js', ['jquery'], $ver, true);
               wp_enqueue_script('product-imageManager', get_stylesheet_directory_uri() . '/js/product/imageManager.js', ['jquery'], $ver, true);

               if (get_option('customiizer_position_editor')) {
                       wp_enqueue_script('position-editor', get_stylesheet_directory_uri() . '/js/product/position_editor.js', ['jquery'], $ver, true);
               }

       } elseif (strpos($request_uri, '/compte') !== false) {
               // --- CSS ---
               wp_enqueue_style('dashboard-style', get_stylesheet_directory_uri() . '/styles/dashboard.css', [], $ver);
               wp_enqueue_style('account-style', get_stylesheet_directory_uri() . '/styles/account.css', [], $ver);
               wp_enqueue_style('account-mobile', get_stylesheet_directory_uri() . '/styles/responsive/mobile/account.css', [], $ver);
               wp_enqueue_style('cropper-style', 'https://cdn.jsdelivr.net/npm/cropperjs@1.5.12/dist/cropper.min.css', [], $ver);

               // --- JS externes ---
               wp_enqueue_script('cropper-js', 'https://cdn.jsdelivr.net/npm/cropperjs@1.5.12/dist/cropper.min.js', [], $ver, true);
               wp_enqueue_script('lazy-sizes', 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.2.2/lazysizes.min.js', [], $ver, true);

               // --- JS internes ---
               wp_enqueue_script('account-sidebar', get_stylesheet_directory_uri() . '/js/account/sidebar.js', ['jquery'], $ver, true);
               wp_enqueue_script('account-dashboard', get_stylesheet_directory_uri() . '/js/account/dashboard.js', ['jquery'], $ver, true);
               wp_enqueue_script('account-purchases', get_stylesheet_directory_uri() . '/js/account/purchases.js', ['jquery'], $ver, true);
               wp_enqueue_script('account-profile', get_stylesheet_directory_uri() . '/js/account/profile.js', ['jquery'], $ver, true);
               wp_enqueue_script('account-pictures', get_stylesheet_directory_uri() . '/js/account/pictures.js', ['jquery'], $ver, true);

       } elseif (strpos($request_uri, '/panier') !== false) {
               // --- CSS ---
               wp_enqueue_style('cart-style', get_stylesheet_directory_uri() . '/styles/cart.css', [], $ver);

               // Page /community
	} elseif (strpos($request_uri, '/communaute') !== false) {
		// --- CSS ---
                wp_enqueue_style('community-style', get_stylesheet_directory_uri() . '/styles/community.css', [], $ver);

		// --- JS internes ---
                wp_enqueue_script('community-images', get_stylesheet_directory_uri() . '/js/community/show_images.js', ['jquery'], $ver, true);

		// Page /mycreation
       } elseif (strpos($request_uri, '/mycreation') !== false) {
               // --- CSS ---
               wp_enqueue_style('mycreation-style', get_stylesheet_directory_uri() . '/styles/mycreation.css', [], $ver);

                // --- JS internes ---
                wp_enqueue_script('mycreation-images', get_stylesheet_directory_uri() . '/js/mycreation/show_images.js', ['jquery'], $ver, true);
       } elseif (
               strpos($request_uri, '/mentions-legales') !== false ||
               strpos($request_uri, '/conditions') !== false ||
               strpos($request_uri, '/confidentialite') !== false ||
               strpos($request_uri, '/retours') !== false ||
               strpos($request_uri, '/cookies') !== false
       ) {
               // --- CSS ---
               wp_enqueue_style('legal-global', get_stylesheet_directory_uri() . '/styles/legal-global.css', [], $ver);
       }

       // --- Responsive CSS ---
       wp_enqueue_style('mobile-base', get_stylesheet_directory_uri() . '/styles/responsive/mobile/base.css', [], $ver, 'all');

       if (is_front_page() || is_page('home')) {
               wp_enqueue_style('mobile-home', get_stylesheet_directory_uri() . '/styles/responsive/mobile/home.css', [], $ver, 'all');
       } elseif (strpos($request_uri, '/customiize') !== false) {
               wp_enqueue_style('mobile-customize', get_stylesheet_directory_uri() . '/styles/responsive/mobile/customize.css', [], $ver, 'all');
       } elseif (strpos($request_uri, '/configurateur') !== false) {
               wp_enqueue_style('mobile-product', get_stylesheet_directory_uri() . '/styles/responsive/mobile/product.css', [], $ver, 'all');
               wp_enqueue_style('mobile-design-product', get_stylesheet_directory_uri() . '/styles/responsive/mobile/design_product.css', [], $ver, 'all');
       } elseif (strpos($request_uri, '/communaute') !== false) {
               wp_enqueue_style('mobile-community', get_stylesheet_directory_uri() . '/styles/responsive/mobile/community.css', [], $ver, 'all');
       } elseif (strpos($request_uri, '/mycreation') !== false) {
               wp_enqueue_style('mobile-mycreation', get_stylesheet_directory_uri() . '/styles/responsive/mobile/mycreation.css', [], $ver, 'all');
       } elseif (
               strpos($request_uri, '/mentions-legales') !== false ||
               strpos($request_uri, '/conditions') !== false ||
               strpos($request_uri, '/confidentialite') !== false ||
               strpos($request_uri, '/retours') !== false ||
               strpos($request_uri, '/cookies') !== false
       ) {
               wp_enqueue_style('mobile-legal', get_stylesheet_directory_uri() . '/styles/responsive/mobile/legal.css', [], $ver, 'all');
       }
}
