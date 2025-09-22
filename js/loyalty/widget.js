jQuery(function($){
    const $button = $('#loyalty-widget-button');
    const $popup = $('#loyalty-widget-popup');
    const $points = $popup.find('.loyalty-widget-points');
    const $back = $('#loyalty-widget-back');
    const $loginBtn = $popup.find('.loyalty-login-btn');
    if(!$button.length || !$popup.length){
        return;
    }
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
    $button.on('click', function(event){
        event.preventDefault();
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

    $loginBtn.on('click', function(){
        if (typeof window.openLoginModal === 'function') {
            window.openLoginModal();
        }
        $popup.removeClass('open');
    });

    const $copyBtn = $popup.find('.loyalty-copy-referral');
    const $copyInput = $popup.find('#loyalty-referral-link');
    const $copyConfirm = $popup.find('.loyalty-copy-confirmation');

    $copyBtn.on('click', function(){
        if (!$copyInput.length) return;
        navigator.clipboard.writeText($copyInput.val()).then(() => {
            $copyConfirm.fadeIn(200).delay(2000).fadeOut(200);
        });
    });
});
