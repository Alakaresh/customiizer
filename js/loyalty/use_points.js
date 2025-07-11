jQuery(function($) {
    $(document).on('click', '#loyalty_points_button', function(e) {
        e.preventDefault();
        var points = $(this).data('points') || 0;

        // Mettre à jour/ajouter le champ caché dans le formulaire concerné
        var $cartForm = $('form.woocommerce-cart-form');
        if ($cartForm.length) {
            // Panier
            $cartForm.find('input[name="loyalty_points_to_use"]').remove();
            $cartForm.find('input[name="update_cart"]').remove();
            $cartForm.append(
                $('<input>', {type: 'hidden', name: 'loyalty_points_to_use', value: points})
            );
            $cartForm.append('<input type="hidden" name="update_cart" value="1">');
            $cartForm.trigger('submit');
        } else {
            // Checkout
            var $input = $('input[name="loyalty_points_to_use"]');
            if (!$input.length) {
                $input = $('<input>', {type: 'hidden', name: 'loyalty_points_to_use'});
                $('form.checkout').append($input);
            }
            $input.val(points);
            $(document.body).trigger('update_checkout');
        }
    });
});
