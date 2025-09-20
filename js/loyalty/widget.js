jQuery(function($){
    const $button = $('#loyalty-widget-button');
    const $popup = $('#loyalty-widget-popup');

    if(!$button.length || !$popup.length){
        return;
    }

    const $points = $popup.find('.loyalty-widget-points');
    const $back = $('#loyalty-widget-back');
    const $loginBtn = $popup.find('.loyalty-login-btn');

    const showPage = (slug) => {
        $popup.find('.loyalty-widget-page').hide();
        $popup.find('.loyalty-page-' + slug).show();
        if (slug === 'main') {
            $points.show();
            $back.hide();
        } else {
            $points.hide();
            $back.show();
        }
    };

    const togglePopup = (open) => {
        if (open) {
            $popup.addClass('open');
            $button.attr('aria-expanded', 'true');
            $popup.attr('aria-hidden', 'false');
            showPage('main');
        } else {
            $popup.removeClass('open');
            $button.attr('aria-expanded', 'false');
            $popup.attr('aria-hidden', 'true');
        }
    };

    $button.on('click', function(event){
        event.preventDefault();
        event.stopPropagation();
        togglePopup(!$popup.hasClass('open'));
    });

    $('#loyalty-widget-close').on('click', function(event){
        event.preventDefault();
        togglePopup(false);
    });

    $popup.on('click', function(event){
        event.stopPropagation();
    });

    $(document).on('click', function(){
        togglePopup(false);
    });

    $(document).on('keydown', function(event){
        if (event.key === 'Escape') {
            togglePopup(false);
        }
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
        togglePopup(false);
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
