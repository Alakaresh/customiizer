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
      <?php echo customiizer_get_cart_body_html(); ?>
    </div>

    <div class="cart-footer">
      <a href="<?php echo wc_get_checkout_url(); ?>" class="checkout-button">Poursuivre la commande</a>
    </div>
  </div>
</div>
