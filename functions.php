<?php
/**
 * Fonctions et définitions du thème enfant personnalisé
 *
 * @package VotreThème
 * @since 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
        exit; // Sortir si accédé directement.
}

add_filter(
        'body_class',
        function ( $classes ) {
                if ( is_page( 'boutique' ) ) {
                        $classes[] = 'shop-flex-layout';
                }

                return $classes;
        }
);
add_filter('woocommerce_order_actions', function($actions) {
    $actions['test_action'] = '🚀 Test bouton';
    return $actions;
});

// Log la valeur brute renvoyée par wc_get_customer_default_location
add_filter('woocommerce_customer_default_location', function($location) {
    error_log('wc_get_customer_default_location() returned: ' . print_r($location, true));

    // Patch sécurité : si c'est un array, on le convertit en string
    if (is_array($location) && isset($location['country'])) {
        return $location['country'] . (isset($location['state']) && $location['state'] ? ':' . $location['state'] : '');
    }

    return $location;
}, 1); // priorité 1 = exécution très tôt

// 1. Classe déclarée globalement
add_action('woocommerce_shipping_init', function () {
        class WC_Custom_Dynamic_Shipping_Method extends WC_Shipping_Method {
		public function __construct($instance_id = 0) {
			$this->id                 = 'custom_dynamic_shipping';
			$this->instance_id       = absint($instance_id);
			$this->method_title       = 'Livraison personnalisée dynamique';
                        $this->method_description = 'Applique le tarif défini par article puis ajoute +1€ pour chaque unité identique supplémentaire.';
			$this->title              = 'Livraison';
			$this->enabled            = 'yes';
			$this->supports           = ['shipping-zones', 'instance-settings'];

			$this->init();
		}

		public function init() {
			$this->instance_form_fields = [];
			$this->init_settings();
		}

		public function calculate_shipping($package = []) {
                        $total_shipping = 0;

                        foreach ($package['contents'] as $item_id => $values) {
                                $quantity   = $values['quantity'];
                                $product_id = $values['product_id'];

                                // Coût de base appliqué une fois par paire produit + variante
                                $base_cost = floatval(get_post_meta($product_id, 'custom_shipping_cost', true));
                                $total_shipping += $base_cost;

                                // +1€ pour chaque unité supplémentaire identique
                                if ($quantity > 1) {
                                        $total_shipping += ($quantity - 1) * 1.00;
                                }
                        }

			$this->add_rate([
				'id'       => $this->id . ':' . $this->instance_id,
				'label'    => $this->title,
				'cost'     => $total_shipping,
				'calc_tax' => 'per_order',
			]);
		}
	}
});

add_filter('woocommerce_shipping_methods', function ($methods) {
	$methods['custom_dynamic_shipping'] = 'WC_Custom_Dynamic_Shipping_Method';
	return $methods;
});



add_action('rest_api_init', function () {

	$api_dir = get_stylesheet_directory() . '/api';

	// Parcours récursif : /api/*.php  et  /api/**/**/*.php
	$iterator = new RecursiveIteratorIterator(
		new RecursiveDirectoryIterator( $api_dir, RecursiveDirectoryIterator::SKIP_DOTS )
	);

	foreach ( $iterator as $file ) {
		if ( $file->getExtension() === 'php' ) {
			require_once $file->getPathname();
		}
	}
} );

add_action( 'init', function() {
	if (file_exists(__DIR__ . '/vendor/autoload.php')) {
		require_once __DIR__ . '/vendor/autoload.php';
	}
        $admin_includes = [
                '/admin/dashboard/admin-dashboard.php',
                '/admin/loyalty/admin-loyalty.php',
                '/admin/update/admin-update.php',
                '/admin/products/admin-products.php',
                '/admin/loadtest/admin-loadtest.php',
        ];

        $includes = [
                '/utilities.php',
                '/assets.php',
                '/includes/azure.php',

		// ===============================
		// WEBHOOKS
		// ===============================
		'/includes/webhook/printful/printful-hook.php',
		// ===============================
		// OTHER
		// ===============================
		//'/includes/api/api_products.php',
		'/includes/create_product.php',
		'/includes/get_user_orders.php',
		//'/includes/webhook.php',
		'/includes/get_all_images.php',
                '/includes/get_generated_images.php',
                '/includes/mockup_tasks.php',
                '/includes/get_user_details.php',
                '/includes/generate_mockup.php',
                '/includes/signin.php',
                '/includes/signup.php',
                '/includes/google_login.php',
                '/includes/save_import_images.php',
		'/includes/save_users_images.php',
		'/includes/products.php',
		'/includes/user_details.php',
                '/includes/decrement_credits.php',
                '/includes/credits.php',
                '/includes/update_user_level.php',
                '/includes/save_account_image.php',
                '/includes/save_base64_image.php',
                '/includes/job_progress.php',
                '/includes/missions.php',
                '/includes/loyalty.php',
                '/includes/api/api_images.php',
                '/includes/api/api_imported_images.php',
                '/includes/api/api_templates.php',
                '/includes/api/api_mockup_status.php',
                '/includes/set_default_country.php',
                '/includes/add_to_cart.php',
                '/includes/cart_actions.php',
                '/includes/rabbitmq_resend_order.php',
                '/includes/render_loadtest.php',

        ];
        if (is_dir(get_stylesheet_directory() . '/admin')) {
                $includes = array_merge($admin_includes, $includes);
        }

        foreach ($includes as $file) {
                $file_path = get_stylesheet_directory() . $file;
                if (file_exists($file_path)) {
                        require_once $file_path;
                } elseif (strpos($file, '/admin/') === false) {
                        error_log('Failed to include ' . $file_path);
                }
        }
});


add_action('init', function () {
	if (
		isset($_GET['action']) &&
		$_GET['action'] === 'generate_invoice' &&
		isset($_GET['order_id']) &&
		isset($_GET['order_key'])
	) {
		add_action('template_redirect', function () {
			$order_id = intval($_GET['order_id']);
			$order = wc_get_order($order_id);

			if (!$order) {
				customiizer_log("❌ Commande introuvable : $order_id");
				wp_die('Commande introuvable');
			}

			if ($_GET['order_key'] !== $order->get_order_key()) {
				customiizer_log("❌ Mauvais order_key pour $order_id");
				wp_die('Clé incorrecte');
			}

			customiizer_log("📥 Tentative de création directe de facture pour order_id=$order_id");

			try {
				if (class_exists('\WPO\WC\PDF_Invoices\Documents\Invoice')) {
					// 👇 On crée le document directement
					$document = new \WPO\WC\PDF_Invoices\Documents\Invoice($order);

					if ($document) {
						$filename = 'facture-customiizer-' . $order->get_order_number() . '.pdf';
						$pdf_data = $document->get_pdf(); // Génère le contenu du PDF
						
						// Headers HTTP pour forcer le téléchargement
						header('Content-Type: application/pdf');
						header('Content-Disposition: attachment; filename="' . $filename . '"');
						header('Content-Length: ' . strlen($pdf_data));
						echo $pdf_data;
						
						customiizer_log("✅ Facture générée directement et envoyée : $filename");
						exit;
					} else {
						customiizer_log("❌ Erreur lors création du document PDF direct");
						wp_die('Erreur création document direct');
					}
				} else {
					customiizer_log("❌ Classe Invoice non disponible (plugin trop modifié ?)");
					wp_die('Classe Invoice indisponible');
				}
			} catch (Throwable $e) {
				customiizer_log("❌ Exception : " . $e->getMessage());
				wp_die('Erreur : ' . $e->getMessage());
			}
		});
	}
});

add_filter('woocommerce_order_number', function ($order_number, $order) {
	$custom_number = $order->get_meta('_order_number');
	return $custom_number ?: $order_number;
}, 10, 2);

add_action('woocommerce_thankyou', function($order_id) {
    $order = wc_get_order($order_id);
    if ($order && $order->get_status() === 'processing') {
        $order->update_status('on-hold', 'Commande repassée manuellement en attente après checkout.');
    }
});


/**
 * Modifier le lien du bouton "Return to shop" sur la page du panier vide
 */

function custom_return_to_shop_redirect() {
	return home_url('/boutique'); // Remplacez '/votre-nouvelle-page' par l'URL de votre choix
}
add_filter('woocommerce_return_to_shop_redirect', 'custom_return_to_shop_redirect');

/**
 * Fonction de création de type de post pour sauvegarder les générations d'image webhook
 */
function create_image_task_post_type() {
	$labels = array(
		'name' => 'Image Tasks',
		'singular_name' => 'Image Task',
		'menu_name' => 'Image Tasks',
	);

	$args = array(
		'labels' => $labels,
		'public' => true,
		'has_archive' => true,
		'supports' => array('title'),
		'show_in_rest' => true,
	);

	register_post_type('image_task', $args);
}
add_action('init', 'create_image_task_post_type');

// Enregistre les statuts supplémentaires
function customiizer_register_order_statuses() {
	register_post_status( 'wc-en-production', [
		'label'                     => 'En production',
		'public'                    => true,
		'show_in_admin_status_list' => true,
		'show_in_admin_all_list'    => true,
		'label_count'               => _n_noop( 'En production <span class="count">(%s)</span>', 'En production <span class="count">(%s)</span>' )
	]);

	register_post_status( 'wc-expediee', [
		'label'                     => 'Expédiée',
		'public'                    => true,
		'show_in_admin_status_list' => true,
		'show_in_admin_all_list'    => true,
		'label_count'               => _n_noop( 'Expédiée <span class="count">(%s)</span>', 'Expédiée <span class="count">(%s)</span>' )
	]);

	register_post_status( 'wc-livree', [
		'label'                     => 'Livrée',
		'public'                    => true,
		'show_in_admin_status_list' => true,
		'show_in_admin_all_list'    => true,
		'label_count'               => _n_noop( 'Livrée <span class="count">(%s)</span>', 'Livrée <span class="count">(%s)</span>' )
	]);
}
add_action( 'init', 'customiizer_register_order_statuses' );

function customiizer_add_order_statuses_to_list( $order_statuses ) {
	$new = [];

	foreach ( $order_statuses as $key => $label ) {
		$new[$key] = $label;

		// Ajouter nos statuts juste après "en cours"
		if ( 'wc-processing' === $key ) {
			$new['wc-en-production'] = 'En production';
			$new['wc-expediee']      = 'Expédiée';
			$new['wc-livree']        = 'Livrée';
		}
	}

	return $new;
}
add_filter( 'wc_order_statuses', 'customiizer_add_order_statuses_to_list' );


add_action('after_setup_theme', function() {
	load_theme_textdomain('astra', get_template_directory() . '/languages');
});

add_filter('retrieve_password_message', 'custom_reset_password_modal_link', 10, 4);

function custom_reset_password_modal_link($message, $key, $user_login, $user_data) {
	$url = site_url('/?reset_key=' . $key . '&login=' . rawurlencode($user_login));

	$message = "Bonjour,\n\n";
	$message .= "Cliquez sur ce lien pour réinitialiser votre mot de passe :\n\n";
	$message .= $url . "\n\n";
	$message .= "Ce lien expirera automatiquement après un certain temps.\n";
	return $message;
}

add_action('wp_head', function() {
    if (function_exists('has_site_icon') && has_site_icon()) {
        echo '<link rel="shortcut icon" href="' . esc_url(get_site_icon_url()) . '" type="image/png">' . "\n";
    }
});

function customiizer_output_color_palette() {
    $defaults = [
        'bg'               => '#242424',
        'primary'          => '#5a90a0',
        'secondary'        => '#007bff',
        'text'             => '#ffffff',
        'text_muted'       => '#6c757d',
        'text_inverse'     => '#000000',
        'header_primary'   => '#5a90a0',
        'header_secondary' => '#007bff',
        'action_primary'   => '#007bff',
        'action_secondary' => '#6c757d',
        'action_accent'    => '#ffc107',
        'on_primary'       => '#ffffff',
        'on_secondary'     => '#ffffff',
        'on_accent'        => '#000000',
        'ui_border'        => '#ced4da',
        'ui_focus'         => '#80bdff',
        'feedback_success' => '#28a745',
        'feedback_warning' => '#ffc107',
        'feedback_danger'  => '#dc3545',
    ];

    $css = ':root{';
    foreach ($defaults as $name => $default) {
        $raw = get_option("customiizer_color_{$name}", null);
        if ($name === 'bg' && !$raw) {
            $raw = get_option('customiizer_color_background', $default);
        }
        $color = sanitize_hex_color($raw ?: $default);
        $var_name = str_replace('_', '-', $name);
        $css .= "--color-{$var_name}: {$color};";
        if ($name === 'bg') {
            // rétrocompatibilité avec l'ancien nom
            $css .= "--color-background: {$color};";
        }
    }
    $css .= '}';

    echo '<style>' . $css . '</style>';
}

if (isset($_SERVER['HTTP_HOST']) && $_SERVER['HTTP_HOST'] === 'dev.customiizer.com') {
    add_action('wp_head', 'customiizer_output_color_palette');
}
