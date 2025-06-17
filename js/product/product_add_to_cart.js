let generatedProductId = null; // Variable globale

function getLatestMockup(variant) {
    return variant.mockups.slice().sort((a, b) => a.mockup_id - b.mockup_id).pop();
}

jQuery(document).ready(function($) {
	$('.add-to-cart-button').on('click', function () {
		console.log('🛒 [CLIC] Bouton "Ajouter au panier" cliqué');
		window.addToCartTemporarilyDisabled = true;
		if (window.addToCartTemporarilyDisabled === true) {
			// ✅ Appel de la fonction (et non juste sa définition)
			//openInfoModal("🚧 Cette fonctionnalité est temporairement désactivée.<br>Veuillez réessayer plus tard.");
			//return;
		}
		// Protection contre double clic
		$(this).prop('disabled', true);

		// Vérification si déjà généré
		if (generatedProductId !== null) {
			console.log('🔄 [REDIRECTION SIMULÉE] Produit déjà généré :', generatedProductId);
			console.log('🔗 Devrait rediriger vers :', `/cart/?add-to-cart=${generatedProductId}`);
			// Pas de redirection réelle pour observer
			return;
		}

		console.log('🛠 [AJAX] Création du produit personnalisé en cours...');

		let productDataToSend = null;
		console.log('productData :',productData);
		if (productData !== null) {
			productDataToSend = productData;
			console.log('selectedVariant :',selectedVariant);
		} else if (selectedVariant) {

			const productName = $('.product-name').text().trim();
			const productPrice = selectedVariant.price ? selectedVariant.price : 0;
			console.log('productPrice :',productPrice);
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
				variant_id: selectedVariant.variant_id,
				placement: selectedVariant.placement || 'default',
				technique: selectedVariant.technique || 'sublimation'
			};
			console.log('productDataToSend :',productDataToSend);
		} else {
			alert("Erreur : Aucun produit ou variante sélectionné !");
			console.error("❌ Aucun produit ou variante sélectionné.");
			return;
		}
		console.log('[🧩 SELECTED] Nouvelle variante sélectionnée :', selectedVariant);

		fetch('/wp-admin/admin-ajax.php?action=generate_custom_product', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: 'product_data=' + encodeURIComponent(JSON.stringify(productDataToSend))
		})
			.then(res => res.json())
			.then(data => {
			if (data.success) {
				console.log("✅ [AJAX SUCCESS] Produit généré :", productDataToSend);
				generatedProductId = data.data.product_id;

				addToCartAjax(generatedProductId, '/cart/');
			} else {
				console.error("❌ [AJAX ERROR] Erreur création produit :", data.data);
				alert("Impossible de créer le produit personnalisé.");
			}
		})
			.catch(err => {
			console.error("❌ [AJAX ERROR] AJAX échoué :", err);
			alert("Erreur réseau.");
		});
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


	function addToCartAjax(productId, redirectUrl = null) {
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
			.then(html => {
			console.log('✅ Produit ajouté au panier en AJAX !');

			// ✅ Si un URL de redirection est donné, on y va !
			if (redirectUrl) {
				console.log('🔗 Redirection vers :', redirectUrl);
				window.location.href = redirectUrl;
			}
		})
			.catch(error => {
			console.error('❌ Erreur ajout au panier :', error);
		});
	}


});
