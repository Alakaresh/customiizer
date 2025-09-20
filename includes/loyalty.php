<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly
}

/**
 * Loyalty system functions.
 *
 * Provides point storage, log tracking and WooCommerce integration.
 */

/**
 * Get loyalty points of a user.
 */
function customiizer_get_loyalty_points( $user_id = 0 ) {
    global $wpdb;
    $user_id = $user_id ? intval( $user_id ) : get_current_user_id();
    if ( ! $user_id ) {
        return 0;
    }

    $sql = $wpdb->prepare( "SELECT points FROM WPC_loyalty_points WHERE user_id = %d", $user_id );
    $points = $wpdb->get_var( $sql );
    return $points ? intval( $points ) : 0;
}

/**
 * Add points to a user.
 */
function customiizer_add_loyalty_points( $user_id, $points, $origin = '', $description = '' ) {
    global $wpdb;
    $user_id = intval( $user_id );
    $points  = intval( $points );
    if ( $user_id <= 0 || $points <= 0 ) {
        return false;
    }

    $result = $wpdb->query( $wpdb->prepare(
        "INSERT INTO WPC_loyalty_points (user_id, points) VALUES (%d, %d)
         ON DUPLICATE KEY UPDATE points = points + VALUES(points)",
        $user_id,
        $points
    ) );

    if ( false !== $result ) {
        customiizer_log_loyalty_movement( $user_id, $points, 'credit', $origin, $description );
    }

    return true;
}

/**
 * Deduct points from a user if available.
 */
function customiizer_use_loyalty_points( $user_id, $points, $origin = '', $description = '' ) {
    global $wpdb;
    $user_id = intval( $user_id );
    $points  = intval( $points );
    if ( $user_id <= 0 || $points <= 0 ) {
        return false;
    }

    $result = $wpdb->query( $wpdb->prepare(
        "UPDATE WPC_loyalty_points SET points = points - %d WHERE user_id = %d",
        $points, $user_id
    ) );

    if ( false !== $result ) {
        customiizer_log_loyalty_movement( $user_id, -$points, 'debit', $origin, $description );
    }
    return true;
}

/**
 * Insert a log entry.
 */
function customiizer_log_loyalty_movement( $user_id, $points, $type, $origin = '', $description = '' ) {
    global $wpdb;
    $wpdb->insert( 'WPC_loyalty_log', array(
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
    echo '<p class="customiizer-loyalty-balance">' . esc_html( sprintf( __( 'Vous avez %d custompoints.', 'customiizer' ), $points ) ) . '</p>';
    echo '<p class="customiizer-loyalty-explanation">' . esc_html__( 'Les custompoints sont des points de fidélité : vous gagnez 5 custompoints par euro dépensé et 100 custompoints valent 1€ de réduction.', 'customiizer' ) . '</p>';
}

/**
 * Show field on checkout to use points.
 */
function customiizer_loyalty_redeem_field() {
    if ( ! is_user_logged_in() ) {
        return;
    }

    $user_id = get_current_user_id();
    $points = customiizer_get_loyalty_points($user_id);

    echo '<tr class="loyalty-points-redeem"><th>' . esc_html__( 'Utiliser mes points', 'customiizer' ) . '</th><td>';
    echo '<input type="hidden" name="loyalty_points_to_use" id="loyalty_points_to_use" value="" />';
    echo '<button type="button" id="loyalty_points_button" class="button" data-points="' . esc_attr( $points ) . '">' . esc_html__( 'Utiliser mes points', 'customiizer' ) . '</button>';
    echo '<p class="description">' . esc_html( sprintf( __( 'Vous avez %d points disponibles', 'customiizer' ), $points ) ) . '</p>';
    echo '</td></tr>';
}

add_action( 'woocommerce_cart_totals_after_order_total', 'customiizer_loyalty_redeem_field' );
add_action( 'woocommerce_review_order_after_order_total', 'customiizer_loyalty_redeem_field' );


/**
 * Apply discount based on points.
 */
add_action( 'woocommerce_cart_calculate_fees', 'customiizer_apply_loyalty_discount' );
function customiizer_apply_loyalty_discount( $cart ) {
    if ( is_admin() && ! defined( 'DOING_AJAX' ) ) return;

    if ( ! is_user_logged_in() ) {
        customiizer_log('discount', 'Utilisateur non connecté');
        return;
    }

    $user_id = get_current_user_id();
    $points_to_use = 0;

    if ( isset($_POST['loyalty_points_to_use']) ) {
        $points_to_use = intval($_POST['loyalty_points_to_use']);
        WC()->session->set('loyalty_points_to_use', $points_to_use);
        customiizer_log('discount', "POST -> $points_to_use points pour user_id=$user_id");
    } else {
        $points_to_use = intval(WC()->session->get('loyalty_points_to_use'));
        customiizer_log('discount', "SESSION -> $points_to_use points pour user_id=$user_id");
    }

    $available = customiizer_get_loyalty_points($user_id);
    $subtotal = $cart->get_subtotal(); // HT
    $max = intval(floor($subtotal * 100));
    $used = min($points_to_use, $available, $max);
    $reduction = $used / 100;

    customiizer_log('discount', "Dispo: $available, Subtotal: $subtotal, Utilisés: $used, Réduction: $reduction €");

    if ($reduction > 0) {
        $cart->add_fee( "Réduction fidélité ($used pts)", -$reduction, false );
        WC()->session->set('loyalty_points_to_use', $used);
        customiizer_log('discount', "Réduction appliquée de -$reduction € pour $used points.");
    } else {
        WC()->session->set('loyalty_points_to_use', 0);
        customiizer_log('discount', "Aucune réduction appliquée.");
    }
}


/**
 * Store points usage in order meta.
 */
add_action( 'woocommerce_checkout_create_order', 'customiizer_store_points_meta', 20, 2 );
function customiizer_store_points_meta( $order, $data ) {
    if ( ! is_user_logged_in() || ! WC()->session ) return;

    $points_used = intval( WC()->session->get('loyalty_points_to_use') );
    if ( $points_used > 0 ) {
        $order->update_meta_data( '_loyalty_points_used', $points_used );
        $order->add_order_note( sprintf( 'Le client a utilisé %d points fidélité (%.2f€ de réduction).', $points_used, $points_used / 100 ) );
    }
    WC()->session->set('loyalty_points_to_use', 0);
}


/**
 * Award and deduct points when order is completed.
 */
add_action( 'woocommerce_order_status_completed', 'customiizer_process_loyalty_after_completion' );
function customiizer_process_loyalty_after_completion( $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order || $order->get_meta( '_loyalty_points_processed' ) ) return;

    $user_id = $order->get_user_id();
    if ( ! $user_id ) return;

    $points_used = intval( $order->get_meta( '_loyalty_points_used' ) );
    if ( $points_used > 0 ) {
        customiizer_use_loyalty_points( $user_id, $points_used, 'paiement', 'Utilisation pour la commande #' . $order->get_order_number() );
    }

    // Award points worth 5% of the order subtotal (ex. taxes).
    $points_earned = intval( $order->get_subtotal() * 5 );
    if ( $points_earned > 0 ) {
        customiizer_add_loyalty_points( $user_id, $points_earned, 'achat', 'Points pour la commande #' . $order->get_order_number() );
    }

    $order->update_meta_data( '_loyalty_points_processed', 1 );
    $order->save();
}


/**
 * Get referral count for a user.
 */
function customiizer_get_referral_count( $user_id = 0 ) {
    global $wpdb;
    $user_id = $user_id ? intval( $user_id ) : get_current_user_id();
    if ( ! $user_id ) {
        return 0;
    }
    $sql = $wpdb->prepare( "SELECT COUNT(*) FROM WPC_referrals WHERE referrer_id = %d", $user_id );
    return intval( $wpdb->get_var( $sql ) );
}

/**
 * Get referral link for a user.
 */
function customiizer_get_referral_link( $user_id = 0 ) {
    $user_id = $user_id ? intval( $user_id ) : get_current_user_id();
    return esc_url( home_url( '/?ref=' . $user_id ) );
}

/**
 * Output or return the loyalty popup widget markup.
 *
 * @param array $args {
 *     Optional. Arguments to control the output.
 *
 *     @type bool $echo Whether to echo the markup. Default true.
 * }
 * @return string Widget markup when $echo is false, empty string otherwise.
 */
function customiizer_loyalty_widget( $args = array() ) {
    $args = wp_parse_args(
        $args,
        array(
            'echo' => true,
        )
    );

    $logged_in = is_user_logged_in();

    if ( $logged_in ) {
        $points    = customiizer_get_loyalty_points();
        $referrals = customiizer_get_referral_count();
        $link      = customiizer_get_referral_link();
        $missions  = customiizer_get_missions();
    } else {
        $points    = 0;
        $referrals = 0;
        $link      = '';
        $missions  = array();
    }

    $template = get_stylesheet_directory() . '/templates/loyalty/widget.php';
    if ( ! file_exists( $template ) ) {
        return '';
    }

    ob_start();
    include $template;
    $markup = ob_get_clean();

    if ( $args['echo'] ) {
        echo $markup; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        return '';
    }

    return $markup;
}

