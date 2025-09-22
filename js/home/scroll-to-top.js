(function ($) {
  'use strict';

  $(function () {
    const $scrollButton = $('.scroll-to-top');

    if (!$scrollButton.length) {
      return;
    }

    const toggleVisibility = () => {
      if (window.scrollY > 280) {
        $scrollButton.addClass('is-visible');
      } else {
        $scrollButton.removeClass('is-visible');
      }
    };

    $(window).on('scroll', toggleVisibility);
    toggleVisibility();

    $scrollButton.on('click', function (event) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
})(jQuery);
