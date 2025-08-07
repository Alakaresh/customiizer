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

  function refreshCartBody(html) {
    const body = cartModal.querySelector('.cart-body');
    if (body) {
      body.innerHTML = html;
      bindCartActions();
      if (taxToggle && !taxToggle.checked) {
        taxToggle.dispatchEvent(new Event('change'));
      }
    }
  }

  function bindCartActions() {
    cartModal.querySelectorAll('.quantity').forEach(input => {
      input.addEventListener('change', function () {
        const key = this.dataset.cartItemKey;
        const qty = this.value;

        fetch(`/wp-admin/admin-ajax.php?action=update_cart_item_quantity&key=${key}&quantity=${qty}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data && data.data.html) {
              refreshCartBody(data.data.html);
            }
          });
      });
    });

    cartModal.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', function () {
        const key = this.dataset.cartItemKey;

        fetch(`/wp-admin/admin-ajax.php?action=remove_cart_item&key=${key}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data && data.data.html) {
              refreshCartBody(data.data.html);
            }
          });
      });
    });
  }

  bindCartActions();

  if (taxToggle) {
    taxToggle.addEventListener('change', function () {
      const showTtc = this.checked;
      cartModal.querySelectorAll('.item-price').forEach(el => {
        el.innerHTML = showTtc ? el.dataset.priceTtc : el.dataset.priceHt;
      });
      const subtotalPrice = cartModal.querySelector('.subtotal-price');
      if (subtotalPrice) {
        subtotalPrice.innerHTML = showTtc ? subtotalPrice.dataset.priceTtc : subtotalPrice.dataset.priceHt;
      }
      const subtotalLine = cartModal.querySelector('.subtotal-line');
      if (subtotalLine) {
        const label = subtotalLine.querySelector('.label');
        label.textContent = showTtc ? subtotalLine.dataset.labelTtc : subtotalLine.dataset.labelHt;
      }
    });
  }
});
