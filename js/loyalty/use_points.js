jQuery(function($) {
    $(document).on('click', '#loyalty_points_button', function(e) {
        e.preventDefault();
        var points = $(this).data('points') || 0;
        $('#loyalty_points_to_use').val(points);
        $(document.body).trigger('update_checkout');
    });
});
