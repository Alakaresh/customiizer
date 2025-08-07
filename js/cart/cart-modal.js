document.addEventListener('DOMContentLoaded', function () {
  const cartButton = document.getElementById('cartButton');
  const cartModal = document.getElementById('cartModal');
  if (!cartButton || !cartModal) return;

  if (sessionStorage.getItem('openCartModal') === 'true') {
    cartModal.style.display = 'flex';
    sessionStorage.removeItem('openCartModal');
  }

  const closeBtn = cartModal.querySelector('.close-cart');
  const taxToggle = document.getElementById('taxToggle');

  cartButton.addEventListener('click', function (e) {
    e.preventDefault();
    cartModal.style.display = 'flex';
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      cartModal.style.display = 'none';
    });
  }

  cartModal.addEventListener('click', function (e) {
    if (e.target === cartModal) {
      cartModal.style.display = 'none';
    }
  });

  // Changement quantité (appel AJAX recommandé ensuite)
  document.querySelectorAll('.quantity').forEach(input => {
    input.addEventListener('change', function () {
      const key = this.dataset.cartItemKey;
      const qty = this.value;

      fetch(`/wp-admin/admin-ajax.php?action=update_cart_item_quantity&key=${key}&quantity=${qty}`)
        .then(() => location.reload()); // ou rafraîchir modal dynamiquement
    });
  });

  // Supprimer un produit
  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', function () {
      const key = this.dataset.cartItemKey;

      fetch(`/wp-admin/admin-ajax.php?action=remove_cart_item&key=${key}`)
        .then(() => location.reload());
    });
  });

  if (taxToggle) {
    taxToggle.addEventListener('change', function () {
      const showTtc = this.checked;
      document.querySelectorAll('.item-price').forEach(el => {
        el.innerHTML = showTtc ? el.dataset.priceTtc : el.dataset.priceHt;
      });
      const shippingPrice = document.querySelector('.shipping-price');
      if (shippingPrice) {
        shippingPrice.innerHTML = showTtc ? shippingPrice.dataset.priceTtc : shippingPrice.dataset.priceHt;
      }
      const subtotalPrice = document.querySelector('.subtotal-price');
      if (subtotalPrice) {
        subtotalPrice.innerHTML = showTtc ? subtotalPrice.dataset.priceTtc : subtotalPrice.dataset.priceHt;
      }
      const shippingLine = document.querySelector('.shipping-line');
      if (shippingLine) {
        const label = shippingLine.querySelector('.label');
        label.textContent = showTtc ? shippingLine.dataset.labelTtc : shippingLine.dataset.labelHt;
      }
      const subtotalLine = document.querySelector('.subtotal-line');
      if (subtotalLine) {
        const label = subtotalLine.querySelector('.label');
        label.textContent = showTtc ? subtotalLine.dataset.labelTtc : subtotalLine.dataset.labelHt;
      }
    });
  }
});
