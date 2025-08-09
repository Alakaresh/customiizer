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

  function refreshCartBody(html, footerHtml) {
    const body = cartModal.querySelector('.cart-body');
    if (body) {
      body.innerHTML = html;
      bindCartActions();
      if (taxToggle && !taxToggle.checked) {
        taxToggle.dispatchEvent(new Event('change'));
      }
    }
    const footer = cartModal.querySelector('.cart-footer');
    if (footer && footerHtml !== undefined) {
      footer.innerHTML = footerHtml;
    }
  }
  window.refreshCartBody = refreshCartBody;

  function bindCartActions() {
    cartModal.querySelectorAll('.quantity').forEach(input => {
      input.addEventListener('change', function () {
        const key = this.dataset.cartItemKey;
        const qty = this.value;

        fetch(`/wp-admin/admin-ajax.php?action=update_cart_item_quantity&key=${key}&quantity=${qty}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data && data.data.html) {
              refreshCartBody(data.data.html, data.data.footer);
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
              refreshCartBody(data.data.html, data.data.footer);
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
      const shippingPrice = cartModal.querySelector('.shipping-price');
      if (shippingPrice) {
        shippingPrice.innerHTML = showTtc ? shippingPrice.dataset.priceTtc : shippingPrice.dataset.priceHt;
      }
      const totalPrice = cartModal.querySelector('.total-price');
      if (totalPrice) {
        totalPrice.innerHTML = showTtc ? totalPrice.dataset.priceTtc : totalPrice.dataset.priceHt;
      }
      const totalLine = cartModal.querySelector('.total-line');
      if (totalLine) {
        const label = totalLine.querySelector('.label');
        label.textContent = showTtc ? totalLine.dataset.labelTtc : totalLine.dataset.labelHt;
      }
    });
  }
});
