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
});
