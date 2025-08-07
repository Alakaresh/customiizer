document.addEventListener('DOMContentLoaded', function () {
  const cartButton = document.getElementById('cartButton');
  const cartModal = document.getElementById('cartModal');
  if (!cartButton || !cartModal) return;

  const closeBtn = cartModal.querySelector('.close-cart');

  cartButton.addEventListener('click', function (e) {
    e.preventDefault();
    cartModal.style.display = 'block';
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
});
