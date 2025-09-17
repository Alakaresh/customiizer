jQuery(document).ready(function ($) {
        const apiURL = '/wp-json/api/v1/products/list';
        const productOptionsContainer = $('#product-options');
        const selectedProductName = $('.product-name');
        const selectedProductImage = $('#dropdown-image');
        const dropdownIcon = $('.dropdown-icon');
        const selectedItem = $('.selected-item');
        const customSelect = $('.product-selector .custom-select');
        const selectedVisual = $('.selected-visual');
        const productTitle = $('.product-title');
        const focusDelay = 170;

        window.currentProductId = window.currentProductId || null; // ID du produit actuellement sélectionné

        const urlParams = new URLSearchParams(window.location.search);
	const initialProductId = urlParams.get('id');
	const initialVariantId = urlParams.get('variant');
	const image_url = urlParams.get('image_url');
	const mockup = urlParams.get('mockup');

        // Gestion de l'ouverture/fermeture du dropdown
        function toggleDropdown(force) {
                const isVisible = productOptionsContainer.is(':visible');
                const shouldOpen = typeof force === 'boolean' ? force : !isVisible;

                if (shouldOpen !== isVisible) {
                        productOptionsContainer.stop(true, true);
                        if (shouldOpen) {
                                productOptionsContainer.slideDown(160);
                        } else {
                                productOptionsContainer.slideUp(160);
                        }
                }

                selectedItem.attr('aria-expanded', shouldOpen);
                dropdownIcon.attr('aria-expanded', shouldOpen);
                productOptionsContainer.attr('aria-hidden', !shouldOpen);
                customSelect.toggleClass('open', shouldOpen);

                return shouldOpen;
        }

        dropdownIcon.on('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                toggleDropdown();
        });

        dropdownIcon.on('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        const opened = toggleDropdown();
                        if (opened) {
                                focusActiveOption();
                        }
                } else if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        toggleDropdown(true);
                        focusActiveOption();
                } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        toggleDropdown(true);
                        focusActiveOption();
                } else if (event.key === 'Escape') {
                        event.preventDefault();
                        toggleDropdown(false);
                }
        });

        selectedItem.on('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                toggleDropdown();
        });

        selectedItem.on('keydown', function (event) {
                if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        const opened = toggleDropdown();
                        if (opened) {
                                focusActiveOption();
                        }
                } else if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        toggleDropdown(true);
                        focusActiveOption();
                } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        toggleDropdown(true);
                        focusActiveOption();
                } else if (event.key === 'Escape') {
                        event.preventDefault();
                        toggleDropdown(false);
                }
        });

        // ✅ Clique sur le nom du produit
        selectedProductName.on('click', function (event) {
                event.stopPropagation();
                toggleDropdown();
        });
	// Fermer le menu si clic ailleurs
        $(document).on('click', function (e) {
                if (!$(e.target).closest('.custom-select, #product-options').length) {
                        toggleDropdown(false);
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
                                        updateSelectedProduct(selectedProduct, true);
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
                        const optionId = `product-option-${product.product_id}`;

                        const productOption = $('<li>', {
                                id: optionId,
                                class: 'product-option',
                                role: 'option',
                                tabindex: -1,
                                'data-id': product.product_id,
                                'data-name': product.name,
                                'data-image': imageUrl,
                                'aria-selected': 'false'
                        });

                        const optionVisual = $('<span>', { class: 'option-visual' }).append(
                                $('<img>', { src: imageUrl, alt: product.name })
                        );

                        const optionText = $('<span>', { class: 'option-text', text: product.name });

                        productOption.append(optionVisual, optionText);
                        productOptionsContainer.append(productOption);
                });

                highlightOption(window.currentProductId);
        }


        function highlightOption(productId) {
                const options = productOptionsContainer.children('li');
                if (!options.length) {
                        return;
                }

                let activeOption = null;

                options.each(function () {
                        const option = $(this);
                        const isActive = productId && option.data('id') == productId;

                        option.toggleClass('active', !!isActive);
                        option.attr('aria-selected', isActive ? 'true' : 'false');
                        option.attr('tabindex', -1);

                        if (isActive) {
                                activeOption = option;
                        }
                });

                if (!activeOption || !activeOption.length) {
                        activeOption = options.first();
                }

                if (activeOption && activeOption.length) {
                        activeOption.attr('tabindex', 0);
                        productOptionsContainer.attr('aria-activedescendant', activeOption.attr('id'));
                }
        }

        function focusActiveOption() {
                const options = productOptionsContainer.children('li');
                if (!options.length) {
                        return;
                }

                const activeOption = productOptionsContainer.find('li.active');
                const target = activeOption.length ? activeOption : options.first();

                setTimeout(() => {
                        target.focus();
                }, focusDelay);
        }


        function updateSelectedProduct(product, initial = false) {
                if (!product) {
                        return;
                }

                selectedProductName.text(product.name);
                productTitle.text(product.name);
                selectedItem.attr('aria-label', product.name);
                selectedItem.attr('data-product-id', product.product_id);

                const newImageSrc = product.image || 'default-image-url.jpg';
                const currentImageSrc = selectedProductImage.attr('src');

                selectedProductImage.off('load.variantSelector error.variantSelector');
                selectedVisual.find('.dropdown-spinner').remove();

                if (currentImageSrc !== newImageSrc) {
                        selectedProductImage.css('visibility', 'hidden');
                        selectedVisual.append('<span class="dropdown-spinner loading-spinner" aria-hidden="true"></span>');

                        selectedProductImage.one('load.variantSelector error.variantSelector', function () {
                                selectedVisual.find('.dropdown-spinner').remove();
                                selectedProductImage.css('visibility', 'visible');
                        });

                        selectedProductImage.attr('src', newImageSrc);
                } else {
                        selectedProductImage.css('visibility', 'visible');
                }

                window.currentProductId = product.product_id;
                highlightOption(product.product_id);

                if (initial) {
                        return;
                }

                const nom = product.name.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Enlève les accents
                .replace(/\s+/g, '-')  // Espaces → tirets
                .replace(/[^a-z0-9-]/g, ''); // Supprime caractères spéciaux

                const newUrl = `/configurateur?nom=${encodeURIComponent(nom)}&id=${product.product_id}&image_url=${image_url}&mockup=${mockup}`;
                history.pushState(null, null, newUrl);

                // Affiche l'overlay avant de charger les détails
                if (window.showLoadingOverlay) {
                        window.showLoadingOverlay();
                }

                // Déclenche un événement pour prévenir l'autre script
                $(document).trigger('productSelected', [product.product_id]);
        }


        productOptionsContainer.on('keydown', 'li', function (event) {
                const currentOption = $(this);

                if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        const nextOption = currentOption.next('li');
                        const target = nextOption.length ? nextOption : productOptionsContainer.children('li').first();
                        target.focus();
                } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        const previousOption = currentOption.prev('li');
                        const target = previousOption.length ? previousOption : productOptionsContainer.children('li').last();
                        target.focus();
                } else if (event.key === 'Home') {
                        event.preventDefault();
                        productOptionsContainer.children('li').first().focus();
                } else if (event.key === 'End') {
                        event.preventDefault();
                        productOptionsContainer.children('li').last().focus();
                } else if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        currentOption.trigger('click');
                } else if (event.key === 'Escape') {
                        event.preventDefault();
                        toggleDropdown(false);
                        selectedItem.focus();
                }
        });

        productOptionsContainer.on('focus', 'li', function () {
                const option = $(this);
                productOptionsContainer.children('li').attr('tabindex', -1);
                option.attr('tabindex', 0);
        });

        // Au clic sur un produit dans la liste
        productOptionsContainer.on('click', 'li', function () {
                const productId = $(this).data('id');
                const productName = $(this).data('name');
                const productImage = $(this).data('image');

                updateSelectedProduct({ product_id: productId, name: productName, image: productImage });
                toggleDropdown(false);
                selectedItem.focus();
        });
});
