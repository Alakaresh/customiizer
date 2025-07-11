jQuery(function($) {
    $(document).on('click', '#loyalty_points_button', function(e) {
        e.preventDefault();
        var points = $(this).data('points') || 0;
        $('#loyalty_points_to_use').val(points);

        // Forcer le recalcul du panier
        var $cartForm = $('form.woocommerce-cart-form');
        if ($cartForm.length) {
            $cartForm.append('<input type="hidden" name="update_cart" value="1">');
            $cartForm.trigger('submit');
        } else {
            // Checkout page
            $(document.body).trigger('update_checkout');
        }
    });
});
