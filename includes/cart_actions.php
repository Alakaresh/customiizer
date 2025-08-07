<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * AJAX handler to update cart item quantity.
 */
function customiizer_update_cart_item_quantity() {
    $cart_item_key = isset( $_GET['key'] ) ? sanitize_text_field( wp_unslash( $_GET['key'] ) ) : '';
    $quantity      = isset( $_GET['quantity'] ) ? intval( $_GET['quantity'] ) : null;

    if ( empty( $cart_item_key ) || null === $quantity ) {
        wp_send_json_error( 'missing_params' );
    }

    if ( $quantity <= 0 ) {
        WC()->cart->remove_cart_item( $cart_item_key );
    } else {
        WC()->cart->set_quantity( $cart_item_key, $quantity, true );
    }

    WC()->cart->calculate_totals();
    wp_send_json_success();
}
add_action( 'wp_ajax_update_cart_item_quantity', 'customiizer_update_cart_item_quantity' );
add_action( 'wp_ajax_nopriv_update_cart_item_quantity', 'customiizer_update_cart_item_quantity' );

/**
 * AJAX handler to remove a cart item.
 */
function customiizer_remove_cart_item() {
    $cart_item_key = isset( $_GET['key'] ) ? sanitize_text_field( wp_unslash( $_GET['key'] ) ) : '';

    if ( empty( $cart_item_key ) ) {
        wp_send_json_error( 'missing_key' );
    }

    WC()->cart->remove_cart_item( $cart_item_key );
    WC()->cart->calculate_totals();
    wp_send_json_success();
}
add_action( 'wp_ajax_remove_cart_item', 'customiizer_remove_cart_item' );
add_action( 'wp_ajax_nopriv_remove_cart_item', 'customiizer_remove_cart_item' );
