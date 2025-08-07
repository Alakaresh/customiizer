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
      <div class="close-cart">×</div>
    </div>

    <div class="cart-body">
      <ul class="custom-cart-items">
        <?php foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) :
          $_product   = $cart_item['data'];
          if ( $_product && $_product->exists() && $cart_item['quantity'] > 0 ) :
        ?>
          <li class="custom-cart-item" data-cart-item-key="<?php echo esc_attr( $cart_item_key ); ?>">
            <div class="item-image">
              <?php echo $_product->get_image(); ?>
            </div>
            <div class="item-info">
              <div class="info-top">
                <p class="item-name"><?php echo $_product->get_name(); ?></p>
                <p class="item-price"><?php echo wc_price( $_product->get_price() ); ?></p>
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

      <div class="cart-summary">
        <p>Coût d'expédition estimé : <strong><?php echo wc_price( WC()->cart->get_shipping_total() ); ?></strong></p>
        <p>Sous-total (taxes incluses) : <strong><?php echo wc_price( WC()->cart->get_subtotal() + WC()->cart->get_subtotal_tax() ); ?></strong></p>
      </div>
    </div>

    <div class="cart-footer">
      <a href="<?php echo wc_get_checkout_url(); ?>" class="checkout-button">Poursuivre la commande</a>
    </div>
  </div>
</div>
