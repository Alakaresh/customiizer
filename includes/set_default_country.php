<?php
/**
 * Définit la localisation et le pays par défaut pour les clients non connectés.
 * Cette configuration force l’application de la TVA française dès l’ajout au panier.
 */

// Force la localisation taxable par défaut à la France.
// WooCommerce utilisera ces valeurs pour déterminer les taxes.
add_filter( 'woocommerce_customer_default_location', function () {
    return [
        'country'  => 'FR',
        'state'    => '',
        'postcode' => '',
        'city'     => '',
    ];
} );

// Au chargement de WordPress, si l’utilisateur n’est pas connecté,
// définit les informations de localisation, de facturation et de livraison.
add_action( 'init', function () {
    // Ne rien faire pour les utilisateurs connectés
    if ( is_user_logged_in() ) {
        return;
    }

    // Vérifie que WooCommerce est disponible et que le client existe
    if ( function_exists( 'WC' ) && WC()->customer ) {
        $customer = WC()->customer;

        // Définit la localisation taxable pour le calcul des taxes
        $customer->set_location( 'FR', '', '', '' );

        // Définit les pays de facturation et de livraison
        $customer->set_billing_country( 'FR' );
        $customer->set_shipping_country( 'FR' );

        // Désactive l’exonération de TVA, pour s’assurer que la taxe est calculée
        $customer->set_is_vat_exempt( false );

        // Enregistre les modifications
        $customer->save();
    }
}, 0 );
