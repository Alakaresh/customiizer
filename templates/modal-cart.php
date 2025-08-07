<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="cartModal" class="cart-modal" style="display:none;">
    <div class="cart-modal-content">
        <div class="close-cart">✖</div>
        <?php if ( function_exists( 'woocommerce_mini_cart' ) ) {
            woocommerce_mini_cart();
        } ?>
    </div>
</div>
