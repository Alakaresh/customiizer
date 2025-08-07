<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

add_filter( 'woocommerce_customer_default_location', function ( $location ) {
    if ( is_user_logged_in() ) {
        return $location;
    }

    return [
        'country' => 'FR',
        'state'   => '',
    ];
} );

add_action( 'woocommerce_init', function () {
    if ( is_user_logged_in() ) {
        return;
    }

    if ( function_exists( 'WC' ) && WC()->customer ) {
        $customer = WC()->customer;
        if ( ! $customer->get_billing_country() ) {
            $customer->set_billing_country( 'FR' );
        }
        if ( ! $customer->get_shipping_country() ) {
            $customer->set_shipping_country( 'FR' );
        }
    }
} );

