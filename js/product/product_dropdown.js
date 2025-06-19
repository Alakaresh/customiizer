jQuery(document).ready(function ($) {
        const apiURL = '/wp-json/api/v1/products/list';
        const productOptionsContainer = $('#product-options');
        const selectedProductName = $('.product-name');
        const selectedProductImage = $('#dropdown-image');
        const dropdownIcon = $('.dropdown-icon');
        const selectedItem = $('.selected-item');

        window.currentProductId = window.currentProductId || null; // ID du produit actuellement sélectionné

        const urlParams = new URLSearchParams(window.location.search);
	const initialProductId = urlParams.get('id');
	const initialVariantId = urlParams.get('variant');
	const image_url = urlParams.get('image_url');
	const mockup = urlParams.get('mockup');

	// Gestion de l'ouverture/fermeture du dropdown
	function toggleDropdown() {
		productOptionsContainer.toggle();
	}

	dropdownIcon.on('click', function (event) {
		event.stopPropagation();
		toggleDropdown();
	});

	selectedItem.on('click', function (event) {
		event.stopPropagation();
		toggleDropdown();
	});

	// ✅ Clique sur le nom du produit
	selectedProductName.on('click', function (event) {
		event.stopPropagation();
		toggleDropdown();
	});
	// Fermer le menu si clic ailleurs
	$(document).on('click', function (e) {
		if (!$(e.target).closest('.custom-select, #product-options').length) {
			productOptionsContainer.hide();
		}
	});

	// Charger la liste des produits
	fetch(apiURL)
		.then(response => {
		if (!response.ok) {
			throw new Error(`Erreur serveur: ${response.status}`);
		}
		return response.json();
	})
		.then(products => {
		if (products.length > 0) {
			populateDropdown(products);

			// Si URL contient un ID au chargement
			if (initialProductId) {
				const selectedProduct = products.find(p => p.product_id == initialProductId);
				if (selectedProduct) {
					updateSelectedProduct(selectedProduct);
				}
			}
		} else {
			console.warn("Aucun produit trouvé dans la liste.");
		}
	})
		.catch(error => {
		console.error("Erreur lors de la récupération des produits :", error);
	});

	// Remplir le dropdown
	function populateDropdown(products) {
		productOptionsContainer.empty();
		products.forEach(product => {
			const imageUrl = product.image || 'default-image-url.jpg';
			const productOption = `
			<li data-id="${product.product_id}" data-name="${product.name}" data-image="${imageUrl}">
				<img src="${imageUrl}" alt="${product.name}">
				<span>${product.name}</span>
			</li>
		`;
			productOptionsContainer.append(productOption);
		});
	}


        function updateSelectedProduct(product) {
                selectedProductName.text(product.name);

                // Met à jour immédiatement l'image du dropdown
                selectedProductImage.attr('src', product.image || 'default-image-url.jpg');

		const nom = product.name.toLowerCase()
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Enlève les accents
		.replace(/\s+/g, '-')  // Espaces → tirets
		.replace(/[^a-z0-9-]/g, ''); // Supprime caractères spéciaux

                window.currentProductId = product.product_id;
                console.log("currentProductId :", window.currentProductId);
                console.log("product :",product);
               const newUrl = `/configurateur?nom=${encodeURIComponent(nom)}&id=${product.product_id}&url=${image_url}&mockup=${mockup}`;
               history.pushState(null, null, newUrl);

                // Affiche l'overlay avant de charger les détails
                if (window.showLoadingOverlay) {
                        window.showLoadingOverlay();
                }

                // Déclenche un événement pour prévenir l'autre script
                $(document).trigger('productSelected', [product.product_id]);
        }


	// Au clic sur un produit dans la liste
	productOptionsContainer.on('click', 'li', function () {
		const productId = $(this).data('id');
		const productName = $(this).data('name');
		const productImage = $(this).data('image');

		updateSelectedProduct({ product_id: productId, name: productName, image: productImage });
		productOptionsContainer.hide();
	});
});
