// js/checkout/checkout-fixes.js
jQuery(function($){

  // 1) Si l'API ?wc-ajax=checkout renvoie { refresh: true }, on recharge la page
  $(document.body).on('checkout_error', function(e, xhr, resp){
    // WooCommerce passe parfois la réponse en 3e arg, parfois il faut la lire depuis xhr
    var data = null;
    try {
      if (resp && typeof resp === 'object') {
        data = resp;
      } else if (xhr && xhr.responseText) {
        data = JSON.parse(xhr.responseText);
      }
    } catch(err){ /* no-op */ }

    if (data && data.refresh) {
      window.location.reload();
    }
  });

});
