jQuery(function ($) {
    const $button = $('#loyalty-widget-button');
    const $popup = $('#loyalty-widget-popup');

    if (!$button.length || !$popup.length) {
        return;
    }

    const $points = $popup.find('.loyalty-header-points');
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

    const closePopup = () => {
        if (!$popup.hasClass('open')) {
            return;
        }
        $popup.removeClass('open');
        $button.attr('aria-expanded', 'false');
    };

    const openPopup = () => {
        showPage('main');
        $popup.addClass('open');
        $button.attr('aria-expanded', 'true');
    };

    $button.on('click', function (event) {
        event.preventDefault();
        if ($popup.hasClass('open')) {
            closePopup();
        } else {
            openPopup();
        }
    });

    $('#loyalty-widget-close').on('click', function () {
        closePopup();
    });

    $popup.find('.loyalty-how-get').on('click', function () {
        showPage('get');
    });

    $popup.find('.loyalty-how-use').on('click', function () {
        showPage('use');
    });

    $popup.find('.loyalty-back-main').on('click', function () {
        showPage('main');
    });

    $loginBtn.on('click', function () {
        if (typeof window.openLoginModal === 'function') {
            window.openLoginModal();
        }
        closePopup();
    });

    const $copyBtn = $popup.find('.loyalty-copy-referral');
    const $copyInput = $popup.find('#loyalty-referral-link');
    const $copyConfirm = $popup.find('.loyalty-copy-confirmation');

    $copyBtn.on('click', function () {
        if (!$copyInput.length || !navigator.clipboard) {
            return;
        }
        navigator.clipboard.writeText($copyInput.val()).then(() => {
            $copyConfirm.fadeIn(200).delay(2000).fadeOut(200);
        });
    });

    $(document).on('click', function (event) {
        if (!$popup.hasClass('open')) {
            return;
        }
        if (!$(event.target).closest('#loyalty-widget-popup, #loyalty-widget-button').length) {
            closePopup();
        }
    });

    $(document).on('keydown', function (event) {
        if (event.key === 'Escape') {
            closePopup();
        }
    });
});
