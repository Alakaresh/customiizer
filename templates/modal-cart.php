<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="cartModal" class="cart-modal">
  <div class="cart-modal-content">
    <div class="cart-header">
      <span class="cart-title">Mon panier</span>
      <div class="close-cart">×</div>
    </div>
    <div class="cart-body">
      <?php if ( function_exists( 'woocommerce_mini_cart' ) ) {
          woocommerce_mini_cart();
      } ?>
    </div>
    <div class="cart-footer">
      <a href="<?php echo wc_get_checkout_url(); ?>" class="checkout-button">Poursuivre la commande</a>
    </div>
  </div>
</div>
