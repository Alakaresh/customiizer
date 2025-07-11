jQuery(function($) {
    $(document).on('click', '#loyalty_points_button', function(e) {
        e.preventDefault();
        $('#loyalty_points_to_use').val(999999); // on force la valeur
        var $cartForm = $('form.woocommerce-cart-form');
        if ($cartForm.length) {
            var $updateBtn = $cartForm.find('button[name="update_cart"]');
            if ($updateBtn.length) {
                $updateBtn.prop('disabled', false).trigger('click');
            } else {
                $cartForm.append('<input type="hidden" name="update_cart" value="1">').trigger('submit');
            }
        } else {
            $(document.body).trigger('update_checkout');
        }
    });
});
