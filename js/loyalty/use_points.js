jQuery(function($) {
    $(document).on('click', '#loyalty_points_button', function(e) {
        e.preventDefault();

        // Injecte une valeur très haute, le PHP fera le tri
        $('#loyalty_points_to_use').val(999999);

        var $cartForm = $('form.woocommerce-cart-form');
        if ($cartForm.length) {
            var $updateBtn = $cartForm.find('button[name="update_cart"]');
            if ($updateBtn.length) {
                $updateBtn.prop('disabled', false);
                $updateBtn.trigger('click');
            } else {
                $cartForm.append('<input type="hidden" name="update_cart" value="1">');
                $cartForm.trigger('submit');
            }
        } else {
            $(document.body).trigger('update_checkout');
        }
    });
});
