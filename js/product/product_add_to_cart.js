window.generatedProductId = window.generatedProductId || null;
window.productCreationPromise = window.productCreationPromise || null;

function getLatestMockup(variant) {
    return variant.mockups.slice().sort((a, b) => a.mockup_id - b.mockup_id).pop();
}

jQuery(document).ready(function($) {
        $('.add-to-cart-button').on('click', function () {
                window.addToCartTemporarilyDisabled = true;
                if (window.addToCartTemporarilyDisabled === true) {
                        //openInfoModal("🚧 Cette fonctionnalité est temporairement désactivée.<br>Veuillez réessayer plus tard.");
                }
                const button = $(this);
                button.prop('disabled', true);

                const cartModal = document.getElementById('cartModal');
                if (cartModal) {
                        cartModal.style.display = 'flex';
                        const body = cartModal.querySelector('.cart-body');
                        if (body) {
                                body.innerHTML = '<p class="creating-message">Création du produit...</p>';
                        }
                }

                const proceed = (pid) => { addToCartAjax(pid); };

                if (window.generatedProductId) {
                        proceed(window.generatedProductId);
                        return;
                }

                let productDataToSend = null;
                if (productData !== null) {
                        productDataToSend = productData;
                } else if (window.DesignCache?.getLastDesign) {
                        productDataToSend = window.DesignCache.getLastDesign(window.currentProductId);
                } else if (window.customizerCache?.designs?.[window.currentProductId]) {
                        productDataToSend = window.customizerCache.designs[window.currentProductId];
                } else if (selectedVariant) {

			const productName = $('.product-name').text().trim();
			const productPrice = selectedVariant.price ? selectedVariant.price : 0;
			productDataToSend = {
				product_name: productName,
				product_price: productPrice,
				delivery_price: selectedVariant.delivery_price || 0,
                                mockup_url: getAbsoluteUrl(getLatestMockup(selectedVariant)?.mockup_image || ''),
				design_image_url: '',
				design_width: selectedVariant.print_area_width || 0,
                                design_height: selectedVariant.print_area_height || 0,
                                design_left: 0,
                                design_top: 0,
                                design_angle: 0,
                                design_flipX: false,
                                variant_id: selectedVariant.variant_id,
                                placement: selectedVariant.placement || 'default',
                                technique: selectedVariant.technique || 'sublimation'
                        };
                } else {
			alert("Erreur : Aucun produit ou variante sélectionné !");
			console.error("❌ Aucun produit ou variante sélectionné.");
			return;
		}

                if (window.productCreationPromise) {
                        window.productCreationPromise.then(proceed).catch(err => {
                                console.error('❌ [AJAX ERROR] ', err);
                                alert('Impossible de créer le produit personnalisé.');
                                button.prop('disabled', false);
                        });
                        return;
                }

                window.productCreationPromise = window.createProduct(productDataToSend);
                window.productCreationPromise.then(proceed)
                        .catch(err => {
                                console.error('❌ [AJAX ERROR] Erreur création produit :', err);
                                alert('Impossible de créer le produit personnalisé.');
                                button.prop('disabled', false);
                        })
                        .finally(() => { window.productCreationPromise = null; });
        });
	function getAbsoluteUrl(path) {
		if (!path) return '';

		// Si déjà une URL complète
		if (path.startsWith('http://') || path.startsWith('https://')) {
			return path;
		}

		// Forcer un / devant si oublié
		if (!path.startsWith('/')) {
			path = '/' + path;
		}

		return window.location.origin + path;
	}


        function addToCartAjax(productId) {
                fetch(`/?add-to-cart=${productId}`, {
                        method: 'GET',
                        headers: {
                                'X-Requested-With': 'XMLHttpRequest'
                        }
                })
                        .then(response => {
                                if (!response.ok) {
                                        throw new Error('Erreur lors de l\'ajout au panier.');
                                }
                                return response.text();
                        })
                        .then(() => {
                                return fetch('/wp-admin/admin-ajax.php?action=refresh_cart');
                        })
                        .then(res => res.json())
                        .then(data => {
                                if (data.success && data.data) {
                                        if (typeof window.refreshCartBody === 'function') {
                                                window.refreshCartBody(data.data.html, data.data.footer);
                                        } else {
                                                const cartModal = document.getElementById('cartModal');
                                                if (cartModal) {
                                                        const body = cartModal.querySelector('.cart-body');
                                                        if (body) body.innerHTML = data.data.html;
                                                        const footer = cartModal.querySelector('.cart-footer');
                                                        if (footer) footer.innerHTML = data.data.footer;
                                                }
                                        }
                                }
                        })
                        .catch(error => {
                                console.error('❌ Erreur ajout au panier :', error);
                        });
        }


});
