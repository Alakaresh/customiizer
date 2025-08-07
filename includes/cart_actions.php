<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Returns the inner HTML for the cart modal body (list of items and summary).
 */
function customiizer_get_cart_body_html() {
    WC()->cart->calculate_totals();

    ob_start();

    if ( WC()->cart->is_empty() ) :
        ?>
        <p class="empty-cart-message">Votre panier est vide.</p>
        <?php
    else :
        ?>
        <ul class="custom-cart-items">
            <?php foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) :
                $_product = $cart_item['data'];
                if ( $_product && $_product->exists() && $cart_item['quantity'] > 0 ) :
                    $price_ht  = wc_get_price_excluding_tax( $_product );
                    $price_ttc = wc_get_price_including_tax( $_product );
                    ?>
                    <li class="custom-cart-item" data-cart-item-key="<?php echo esc_attr( $cart_item_key ); ?>">
                        <div class="item-image">
                            <?php echo $_product->get_image(); ?>
                        </div>
                        <div class="item-info">
                            <div class="info-top">
                                <p class="item-name"><?php echo $_product->get_name(); ?></p>
                                <p class="item-price" data-price-ht="<?php echo esc_attr( wc_price( $price_ht ) ); ?>" data-price-ttc="<?php echo esc_attr( wc_price( $price_ttc ) ); ?>"><?php echo wc_price( $price_ttc ); ?></p>
                            </div>
                            <div class="item-qty">
                                <label>Qté :</label>
                                <input type="number" min="1" step="1" value="<?php echo esc_attr( $cart_item['quantity'] ); ?>" class="quantity" data-cart-item-key="<?php echo esc_attr( $cart_item_key ); ?>">
                            </div>
                        </div>
                        <button class="remove-item" data-cart-item-key="<?php echo esc_attr( $cart_item_key ); ?>" title="Supprimer">🗑️</button>
                    </li>
                <?php endif; endforeach; ?>
        </ul>

        <?php
        $shipping_total_ht  = WC()->cart->get_shipping_total();
        $shipping_total_ttc = $shipping_total_ht + WC()->cart->get_shipping_tax();
        $subtotal_ht        = WC()->cart->get_subtotal();
        $subtotal_ttc       = $subtotal_ht + WC()->cart->get_subtotal_tax();
        ?>
        <div class="cart-summary">
            <p class="shipping-line" data-label-ht="Coût d'expédition estimé (HT) :" data-label-ttc="Coût d'expédition estimé (TTC) :">
                <span class="label">Coût d'expédition estimé (TTC) :</span>
                <strong class="shipping-price" data-price-ht="<?php echo esc_attr( wc_price( $shipping_total_ht ) ); ?>" data-price-ttc="<?php echo esc_attr( wc_price( $shipping_total_ttc ) ); ?>"><?php echo wc_price( $shipping_total_ttc ); ?></strong>
            </p>
            <p class="subtotal-line" data-label-ht="Sous-total (HT) :" data-label-ttc="Sous-total (TTC) :">
                <span class="label">Sous-total (TTC) :</span>
                <strong class="subtotal-price" data-price-ht="<?php echo esc_attr( wc_price( $subtotal_ht ) ); ?>" data-price-ttc="<?php echo esc_attr( wc_price( $subtotal_ttc ) ); ?>"><?php echo wc_price( $subtotal_ttc ); ?></strong>
            </p>
        </div>
        <?php
    endif;

    <?php
    $shipping_total     = WC()->cart->get_shipping_total() + WC()->cart->get_shipping_tax();
    $subtotal_ht        = WC()->cart->get_subtotal();
    $subtotal_ttc       = $subtotal_ht + WC()->cart->get_subtotal_tax();
    ?>
    <div class="cart-summary">
        <p class="shipping-line">
            <span class="label">Coût d'expédition estimé :</span>
            <strong class="shipping-price"><?php echo wc_price( $shipping_total ); ?></strong>
        </p>
        <p class="subtotal-line" data-label-ht="Sous-total (HT) :" data-label-ttc="Sous-total (TTC) :">
            <span class="label">Sous-total (TTC) :</span>
            <strong class="subtotal-price" data-price-ht="<?php echo esc_attr( wc_price( $subtotal_ht ) ); ?>" data-price-ttc="<?php echo esc_attr( wc_price( $subtotal_ttc ) ); ?>"><?php echo wc_price( $subtotal_ttc ); ?></strong>
        </p>
    </div>
    <?php

    return ob_get_clean();
}

/**
 * Returns the HTML for the cart modal footer.
 */
function customiizer_get_cart_footer_html() {
    if ( WC()->cart->is_empty() ) {
        $shop_url = wc_get_page_permalink( 'shop' );
        return '<a href="' . esc_url( $shop_url ) . '" class="checkout-button">Voir la boutique</a>';
    }

    return '<a href="' . esc_url( wc_get_checkout_url() ) . '" class="checkout-button">Poursuivre la commande</a>';
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
    wp_send_json_success( array(
        'html'   => customiizer_get_cart_body_html(),
        'footer' => customiizer_get_cart_footer_html(),
    ) );
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
    wp_send_json_success( array(
        'html'   => customiizer_get_cart_body_html(),
        'footer' => customiizer_get_cart_footer_html(),
    ) );
}
add_action( 'wp_ajax_remove_cart_item', 'customiizer_remove_cart_item' );
add_action( 'wp_ajax_nopriv_remove_cart_item', 'customiizer_remove_cart_item' );
