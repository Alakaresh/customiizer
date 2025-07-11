jQuery(function($){
    const $button = $('<div id="loyalty-widget-button"><i class="fas fa-gift"></i></div>');
    const $popup = $('#loyalty-widget-popup');
    $('body').append($button);
    $button.on('click', function(){
        $popup.toggleClass('open');
    });
    $('#loyalty-widget-close').on('click', function(){
        $popup.removeClass('open');
    });
});
