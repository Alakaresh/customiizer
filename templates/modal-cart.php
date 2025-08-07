<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
// Ensure cart totals are calculated so prices such as the subtotal are accurate
WC()->cart->calculate_totals();
?>
<div id="cartModal" class="cart-modal">
  <div class="cart-modal-content">
    <div class="cart-header">
      <span class="cart-title">Mon panier</span>
      <div class="tax-toggle">
        <span>HT</span>
        <label class="switch">
          <input type="checkbox" id="taxToggle" checked>
          <span class="slider"></span>
        </label>
        <span>TTC</span>
      </div>
      <div class="close-cart">×</div>
    </div>

    <div class="cart-body">
      <ul class="custom-cart-items">
        <?php foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) :
          $_product   = $cart_item['data'];
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
    </div>

    <div class="cart-footer">
      <a href="<?php echo wc_get_checkout_url(); ?>" class="checkout-button">Poursuivre la commande</a>
    </div>
  </div>
</div>
