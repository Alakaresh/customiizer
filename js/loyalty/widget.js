jQuery(function($){
    const $popup = $('#loyalty-widget-popup');
    if(!$popup.length){
        return;
    }

    let $button = $('#loyalty-widget-button');
    if(!$button.length){
        $button = $('<button>', {
            type: 'button',
            id: 'loyalty-widget-button',
            'aria-haspopup': 'dialog',
            'aria-expanded': 'false',
            'aria-label': 'Mes avantages'
        }).append('<i class="fas fa-gift" aria-hidden="true"></i>');
        $('body').append($button);
    } else {
        if(!$button.attr('aria-haspopup')){
            $button.attr('aria-haspopup', 'dialog');
        }
        if(!$button.attr('aria-expanded')){
            $button.attr('aria-expanded', 'false');
        }
    }

    const $points = $popup.find('.loyalty-widget-points');
    const $back = $('#loyalty-widget-back');
    const $loginBtn = $popup.find('.loyalty-login-btn');
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

    const setExpanded = (expanded) => {
        $button.attr('aria-expanded', expanded ? 'true' : 'false');
    };

    const openPopup = () => {
        $popup.addClass('open');
        showPage('main');
        setExpanded(true);
    };

    const closePopup = () => {
        $popup.removeClass('open');
        setExpanded(false);
    };

    $button.on('click', function(){
        if($popup.hasClass('open')){
            closePopup();
        } else {
            openPopup();
        }
    });
    $('#loyalty-widget-close').on('click', function(){
        closePopup();
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
        closePopup();
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

    $(document).on('click', function(event){
        if(!$popup.hasClass('open')){
            return;
        }

        const $target = $(event.target);
        if($target.is($popup) || $popup.has($target).length){
            return;
        }

        if($target.is($button) || $button.has($target).length){
            return;
        }

        closePopup();
    });

    $(document).on('keydown', function(event){
        if(event.key === 'Escape' && $popup.hasClass('open')){
            closePopup();
        }
    });
});
