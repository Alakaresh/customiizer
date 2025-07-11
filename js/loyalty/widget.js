jQuery(function($){
    const $button = $('<div id="loyalty-widget-button"><i class="fas fa-gift"></i></div>');
    const $popup = $('#loyalty-widget-popup');
    const $points = $popup.find('.loyalty-widget-points');
    const $back = $('#loyalty-widget-back');
    const showPage = (slug) => {
        $popup.find('.loyalty-widget-page').hide();
        $popup.find('.loyalty-page-' + slug).show();
        if(slug === 'main'){
            $points.show();
            $back.hide();
        } else {
            $points.hide();
            $back.show();
        }
    };
    $('body').append($button);
    $button.on('click', function(){
        $popup.toggleClass('open');
        if($popup.hasClass('open')){
            showPage('main');
        }
    });
    $('#loyalty-widget-close').on('click', function(){
        $popup.removeClass('open');
    });
    $popup.find('.loyalty-how-get').on('click', function(){
        showPage('get');
    });
    $popup.find('.loyalty-how-use').on('click', function(){
        showPage('use');
    });
    $popup.find('.loyalty-back-main').on('click', function(){
        showPage('main');
    });
});
