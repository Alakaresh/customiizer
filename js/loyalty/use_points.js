jQuery(function($) {
    $(document).on('click', '#loyalty_points_button', function(e) {
        e.preventDefault();
        var points = $(this).data('points') || 0;
        $('#loyalty_points_to_use').val(points);

        // On the cart page submit the cart form so the discount is applied
        var $cartForm = $('form.woocommerce-cart-form');
        if ($cartForm.length) {
            var $updateBtn = $cartForm.find('button[name="update_cart"]');
            if ($updateBtn.length) {
                $updateBtn.prop('disabled', false);
                $updateBtn.trigger('click');
            } else {
                // Fallback: add hidden update parameter and submit
                $cartForm.append('<input type="hidden" name="update_cart" value="1">');
                $cartForm.trigger('submit');
            }
        } else {
            // Checkout page - refresh totals
            $(document.body).trigger('update_checkout');
        }
    });
});
