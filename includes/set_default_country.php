<?php
/**
 * Définit la localisation taxable pour les clients non connectés et recalcule les totaux.
 * À placer dans includes/set_default_country.php et inclus dans functions.php.
 */

// Définir le pays par défaut (utile si WooCommerce cherche cette valeur dès la première visite)
add_filter( 'woocommerce_customer_default_location', function () {
    return [
        'country'  => 'FR',
        'state'    => '',
        'postcode' => '',
        'city'     => '',
    ];
} );

// Après l’initialisation de WooCommerce
add_action( 'woocommerce_init', function () {
    // Ne rien faire pour les utilisateurs connectés
    if ( is_user_logged_in() ) {
        return;
    }

    if ( function_exists( 'WC' ) && WC()->customer ) {
        $customer = WC()->customer;

        // Définir la localisation taxable (pays/état/code postal/ville)
        $customer->set_location( 'FR', '', '', '' );

        // Définir aussi les pays de facturation et de livraison
        $customer->set_billing_country( 'FR' );
        $customer->set_shipping_country( 'FR' );

        // Forcer la TVA à être appliquée (non exempté)
        $customer->set_is_vat_exempt( false );

        // Enregistrer ces changements
        $customer->save();

        // Recalculer les totaux si un panier existe déjà
        if ( ! WC()->cart->is_empty() ) {
            WC()->cart->calculate_totals();
        }
    }
}, 20 ); // Priorité après le chargement de WooCommerce
