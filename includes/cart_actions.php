<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Returns the inner HTML for the cart modal body (list of items).
 */
function customiizer_get_cart_body_html() {
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
                    $price_ht       = wc_get_price_excluding_tax( $_product );
                    $price_ttc      = wc_get_price_including_tax( $_product );
                    $line_total_ht  = wc_get_price_excluding_tax( $_product, array( 'qty' => $cart_item['quantity'] ) );
                    $line_total_ttc = wc_get_price_including_tax( $_product, array( 'qty' => $cart_item['quantity'] ) );
                    $input_id       = 'cart-qty-' . $cart_item_key;
                    ?>
                    <li class="custom-cart-item" data-cart-item-key="<?php echo esc_attr( $cart_item_key ); ?>">
                        <div class="item-image">
                            <?php echo $_product->get_image(); ?>
                        </div>
                        <div class="item-info">
                            <div class="info-top">
                                <p class="item-name"><?php echo $_product->get_name(); ?></p>
                                <p class="item-price" data-qty="<?php echo esc_attr( $cart_item['quantity'] ); ?>" data-price-ht="<?php echo esc_attr( wc_price( $price_ht ) ); ?>" data-price-ttc="<?php echo esc_attr( wc_price( $price_ttc ) ); ?>" data-total-ht="<?php echo esc_attr( wc_price( $line_total_ht ) ); ?>" data-total-ttc="<?php echo esc_attr( wc_price( $line_total_ttc ) ); ?>">
                                    <?php echo wc_price( $price_ttc ); // wc_price respects the euro symbol position ?>
                                    <?php if ( $cart_item['quantity'] > 1 ) : ?>
                                        <span class="item-total"><?php echo '(' . wc_price( $line_total_ttc ) . ')'; ?></span>
                                    <?php endif; ?>
                                </p>
                            </div>
                            <div class="item-qty">
                                <label for="<?php echo esc_attr( $input_id ); ?>">Qté :</label>
                                <div class="qty-controls">
                                    <input id="<?php echo esc_attr( $input_id ); ?>" type="number" min="1" step="1" value="<?php echo esc_attr( $cart_item['quantity'] ); ?>" class="quantity" data-cart-item-key="<?php echo esc_attr( $cart_item_key ); ?>">
                                    <button type="button" class="remove-item" data-cart-item-key="<?php echo esc_attr( $cart_item_key ); ?>" title="Supprimer l&rsquo;article" aria-label="Supprimer l&rsquo;article">
                                        <svg class="remove-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                            <path d="M9 10.5a.75.75 0 0 1 1.5 0v8a.75.75 0 0 1-1.5 0v-8Zm4.5-.75a.75.75 0 0 0-.75.75v8a.75.75 0 0 0 1.5 0v-8a.75.75 0 0 0-.75-.75ZM6.75 6a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H6.75Z" />
                                            <path d="M10.5 3.75a.75.75 0 0 0-.75.75v.75h-3a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5h-3V4.5a.75.75 0 0 0-.75-.75h-3Zm-4.2 4.5h11.4l-.57 11.102a2.25 2.25 0 0 1-2.247 2.148H9.017a2.25 2.25 0 0 1-2.247-2.148L6.3 8.25Z" />
                                        </svg>
                                        <span class="sr-only">Supprimer l&rsquo;article</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </li>
                <?php endif; endforeach; ?>
        </ul>

        <?php
    endif;

    return ob_get_clean();
}

/**
 * Returns the HTML for the cart modal footer (note, summary and button).
 */
function customiizer_get_cart_footer_html() {
    WC()->cart->calculate_totals();

    ob_start();

    $note_html = '<p class="cart-note">' . esc_html__( 'Les codes promo et les points pourront être utilisés lors du paiement.', 'customiizer' ) . '</p>';

    if ( WC()->cart->is_empty() ) {
        echo $note_html;

        $shop_url = home_url( '/boutique' );
        ?>
        <a href="<?php echo esc_url( $shop_url ); ?>" class="checkout-button">Voir la boutique</a>
        <?php
    } else {
        $shipping_total_ht  = WC()->cart->get_shipping_total();
        $shipping_tax       = WC()->cart->get_shipping_tax();
        $shipping_total_ttc = $shipping_total_ht + $shipping_tax;
        $subtotal_ht        = WC()->cart->get_subtotal();
        $subtotal_ttc       = $subtotal_ht + WC()->cart->get_subtotal_tax();
        $total_ht           = $subtotal_ht + $shipping_total_ht;
        $total_ttc          = $subtotal_ttc + $shipping_total_ttc;
        ?>
        <div class="cart-summary">
            <p class="shipping-line" data-label-ht="Coût d'expédition estimé :" data-label-ttc="Coût d'expédition estimé :">
                <span class="label">Coût d'expédition estimé :</span>
                <strong class="shipping-price" data-price-ht="<?php echo esc_attr( wc_price( $shipping_total_ht ) ); ?>" data-price-ttc="<?php echo esc_attr( wc_price( $shipping_total_ttc ) ); ?>"><?php echo wc_price( $shipping_total_ttc ); ?></strong>
            </p>
            <p class="total-line" data-label-ht="Total (HT) :" data-label-ttc="Total (TTC) :">
                <span class="label">Total (TTC) :</span>
                <strong class="total-price" data-price-ht="<?php echo esc_attr( wc_price( $total_ht ) ); ?>" data-price-ttc="<?php echo esc_attr( wc_price( $total_ttc ) ); ?>"><?php echo wc_price( $total_ttc ); ?></strong>
            </p>
        </div>
        <?php echo $note_html; ?>

        <a href="<?php echo esc_url( wc_get_checkout_url() ); ?>" class="checkout-button">Finaliser la commande</a>
        <?php
    }

    return ob_get_clean();
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

/**
 * AJAX handler to refresh cart modal content.
 */
function customiizer_refresh_cart() {
    wp_send_json_success( array(
        'html'   => customiizer_get_cart_body_html(),
        'footer' => customiizer_get_cart_footer_html(),
    ) );
}
add_action( 'wp_ajax_refresh_cart', 'customiizer_refresh_cart' );
add_action( 'wp_ajax_nopriv_refresh_cart', 'customiizer_refresh_cart' );
