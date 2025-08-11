<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
// Ensure cart totals are calculated so prices such as the subtotal are accurate
WC()->cart->calculate_totals();
?>
<div id="cartModal" class="cart-modal" style="display: none;">
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
      <?php echo customiizer_get_cart_footer_html(); ?>
    </div>
    <p class="cart-note">
      <?php echo esc_html__( 'Les codes promo et les points pourront être utilisés lors du paiement.', 'customiizer' ); ?>
    </p>
  </div>
</div>
