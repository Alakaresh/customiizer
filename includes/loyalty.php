<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly
}

/**
 * Loyalty system functions.
 *
 * Provides point storage, log tracking and WooCommerce integration.
 */

$points_table = 'WPC_loyalty_points';
$log_table    = 'WPC_loyalty_log';

/**
 * Get loyalty points of a user.
 */
function customiizer_get_loyalty_points( $user_id = 0 ) {
    global $wpdb, $points_table;
    $user_id = $user_id ? intval( $user_id ) : get_current_user_id();
    if ( ! $user_id ) {
        return 0;
    }
    $points = $wpdb->get_var( $wpdb->prepare( "SELECT points FROM {$points_table} WHERE user_id = %d", $user_id ) );
    return $points ? intval( $points ) : 0;
}

/**
 * Add points to a user.
 */
function customiizer_add_loyalty_points( $user_id, $points, $origin = '', $description = '' ) {
    global $wpdb, $points_table;
    $user_id = intval( $user_id );
    $points  = intval( $points );
    if ( $user_id <= 0 || $points <= 0 ) {
        return false;
    }

    $wpdb->query( $wpdb->prepare(
        "INSERT INTO {$points_table} (user_id, points) VALUES (%d, %d)
         ON DUPLICATE KEY UPDATE points = points + VALUES(points)",
        $user_id, $points
    ) );

    customiizer_log_loyalty_movement( $user_id, $points, 'gain', $origin, $description );

    if ( function_exists( 'customiizer_log' ) ) {
        customiizer_log( 'loyalty', 'Points ajoutés', array(
            'user_id' => $user_id,
            'points'  => $points,
            'origin'  => $origin,
            'desc'    => $description
        ) );
    }

    return true;
}

/**
 * Deduct points from a user if available.
 */
function customiizer_use_loyalty_points( $user_id, $points, $origin = '', $description = '' ) {
    global $wpdb, $points_table;
    $user_id = intval( $user_id );
    $points  = intval( $points );
    if ( $user_id <= 0 || $points <= 0 ) {
        return false;
    }

    $current = customiizer_get_loyalty_points( $user_id );
    if ( $current < $points ) {
        return false;
    }

    $wpdb->query( $wpdb->prepare(
        "UPDATE {$points_table} SET points = points - %d WHERE user_id = %d",
        $points, $user_id
    ) );

    customiizer_log_loyalty_movement( $user_id, $points, 'use', $origin, $description );

    if ( function_exists( 'customiizer_log' ) ) {
        customiizer_log( 'loyalty', 'Points utilisés', array(
            'user_id' => $user_id,
            'points'  => $points,
            'origin'  => $origin,
            'desc'    => $description
        ) );
    }

    return true;
}

/**
 * Insert a log entry.
 */
function customiizer_log_loyalty_movement( $user_id, $points, $type, $origin = '', $description = '' ) {
    global $wpdb, $log_table;
    $wpdb->insert( $log_table, array(
        'user_id'     => intval( $user_id ),
        'points'      => intval( $points ),
        'type'        => sanitize_text_field( $type ),
        'origin'      => sanitize_text_field( $origin ),
        'description' => sanitize_textarea_field( $description ),
    ), array( '%d', '%d', '%s', '%s', '%s' ) );
}

/**
 * Display points on the account dashboard.
 */
add_action( 'woocommerce_account_dashboard', 'customiizer_display_loyalty_balance' );
function customiizer_display_loyalty_balance() {
    if ( ! is_user_logged_in() ) {
        return;
    }
    $points = customiizer_get_loyalty_points();
    echo '<p class="customiizer-loyalty-balance">' . esc_html( sprintf( __( 'Vous avez %d points fidélité.', 'customiizer' ), $points ) ) . '</p>';
}

/**
 * Show field on checkout to use points.
 */
function customiizer_loyalty_redeem_field() {
    $user_id = get_current_user_id();
    $points = customiizer_get_loyalty_points($user_id);
    
    // Debug SQL
    global $wpdb, $points_table;
    $sql = $wpdb->prepare( "SELECT points FROM {$points_table} WHERE user_id = %d", $user_id );
    $result = $wpdb->get_var( $sql );
    
    customiizer_log("DEBUG: user_id = $user_id | SQL = $sql | result = $result | via_function = $points");

}


add_action( 'woocommerce_cart_totals_after_order_total', 'customiizer_loyalty_redeem_field' );
add_action( 'woocommerce_review_order_after_order_total', 'customiizer_loyalty_redeem_field' );

/**
 * Apply discount based on points.
 */
add_action( 'woocommerce_cart_calculate_fees', 'customiizer_apply_loyalty_discount' );
function customiizer_apply_loyalty_discount( $cart ) {
    if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
        return;
    }
    if ( ! is_user_logged_in() ) {
        return;
    }

    $points_to_use = 0;
    if ( isset( $_POST['loyalty_points_to_use'] ) ) {
        $points_to_use = intval( $_POST['loyalty_points_to_use'] );
        WC()->session->set( 'loyalty_points_to_use', $points_to_use );
    } elseif ( WC()->session ) {
        $points_to_use = intval( WC()->session->get( 'loyalty_points_to_use' ) );
    }

    $available      = customiizer_get_loyalty_points();
    $points_to_use  = min( $points_to_use, $available );
    $discount       = $points_to_use / 100;

    if ( $discount > $cart->get_total( 'edit' ) ) {
        $discount      = $cart->get_total( 'edit' );
        $points_to_use = intval( ceil( $discount * 100 ) );
    }

    if ( $discount > 0 ) {
        $cart->add_fee( __( 'Réduction points fidélité', 'customiizer' ), -$discount );
        WC()->session->set( 'loyalty_points_to_use', $points_to_use );
    } else {
        WC()->session->set( 'loyalty_points_to_use', 0 );
    }
}

/**
 * Store points usage in order meta.
 */
add_action( 'woocommerce_checkout_create_order', 'customiizer_store_points_meta', 20, 2 );
function customiizer_store_points_meta( $order, $data ) {
    if ( ! is_user_logged_in() || ! WC()->session ) {
        return;
    }
    $points_used = intval( WC()->session->get( 'loyalty_points_to_use' ) );
    if ( $points_used > 0 ) {
        $order->update_meta_data( '_loyalty_points_used', $points_used );
    }
    WC()->session->set( 'loyalty_points_to_use', 0 );
}

/**
 * Award and deduct points when order is completed.
 */
add_action( 'woocommerce_order_status_completed', 'customiizer_process_loyalty_after_completion' );
function customiizer_process_loyalty_after_completion( $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order ) {
        return;
    }
    if ( $order->get_meta( '_loyalty_points_processed' ) ) {
        return; // Already processed
    }

    $user_id = $order->get_user_id();
    if ( ! $user_id ) {
        return;
    }

    $points_used = intval( $order->get_meta( '_loyalty_points_used' ) );
    if ( $points_used > 0 ) {
        customiizer_use_loyalty_points( $user_id, $points_used, 'paiement', 'Utilisation pour la commande #' . $order->get_order_number() );
    }

    $points_earned = intval( $order->get_total() * 10 );
    if ( $points_earned > 0 ) {
        customiizer_add_loyalty_points( $user_id, $points_earned, 'achat', 'Points pour la commande #' . $order->get_order_number() );
    }

    $order->update_meta_data( '_loyalty_points_processed', 1 );
    $order->save();
}
