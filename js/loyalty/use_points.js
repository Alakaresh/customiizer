jQuery(function($) {
    $(document).on('click', '#loyalty_points_button', function(e) {
        e.preventDefault();

        const points = $(this).data('points') || 0;
        $('#loyalty_points_to_use').val(points);

        console.log('[LOYALTY] Bouton cliqué, points =', points);

        const $cartForm = $('form.woocommerce-cart-form');
        if ($cartForm.length) {
            $cartForm.find('button[name="update_cart"]').prop('disabled', false).trigger('click');
        } else {
            $(document.body).trigger('update_checkout');
        }
    });
});

