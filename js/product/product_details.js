let selectedVariant = null;
let myGeneratedImages = [];
let communityImages = [];
let currentProductId = null;
let currentMockup = null;

function getLatestMockup(variant) {
    if (!variant.mockups || !variant.mockups.length) return null;
    return variant.mockups[0];
}

// 🌐 Cache global pour les templates et modèles 3D préchargés
try {
    const saved = sessionStorage.getItem('customizerCache');
    const savedData = saved ? JSON.parse(saved) : {};
    window.customizerCache = {
        ...(savedData || {}),
        ...(window.customizerCache || {})
    };
} catch (e) {
    window.customizerCache = window.customizerCache || {};
}
window.customizerCache.templates = window.customizerCache.templates || {};
window.customizerCache.models = window.customizerCache.models || {};
window.customizerCache.variants = window.customizerCache.variants || {};

function persistCache() {
    const tmp = { ...window.customizerCache, models: {} };
    sessionStorage.setItem('customizerCache', JSON.stringify(tmp));
}
jQuery(document).ready(function ($) {
        const apiBaseURL = '/wp-json/api/v1/products';
        const mainProductImage = $('#product-main-image');

        let currentVariants = [];

        // Préchargement du template et du modèle 3D pour une variante
        async function preloadVariantAssets(variant) {
                if (!variant) return;

                const vid = variant.variant_id;

                if (vid && !window.customizerCache.templates[vid]) {
                        try {
                                const res = await fetch(`/wp-json/custom-api/v1/variant-template/${vid}`);
                                const data = await res.json();
                                if (data.success && data.template) {
                                        window.customizerCache.templates[vid] = data.template;
                                        console.log('[Cache] Template préchargé pour', vid);
                                }
                        } catch (e) {
                                console.error('[Cache] Erreur préchargement template:', e);
                        }
                }

                const modelUrl = variant.url_3d;
                if (modelUrl && !window.customizerCache.models[modelUrl]) {
                        const loader = new THREE.GLTFLoader();
                        loader.load(modelUrl, (gltf) => {
                                window.customizerCache.models[modelUrl] = gltf;
                                console.log('[Cache] Modèle 3D préchargé pour', modelUrl);
                        }, undefined, (err) => {
                                console.error('[Cache] Erreur préchargement modèle 3D:', err);
                        });
                }
        }

	// Dès le chargement général de la page
	preloadCommunityImages().then(() => {
		const images = getAllCommunityImages();
		myGeneratedImages = images.filter(img => img.user_id === currentUser.ID);
		communityImages = images.filter(img => img.user_id !== currentUser.ID);

		console.log("myGeneratedImages :", myGeneratedImages);
		displayGeneratedImages(myGeneratedImages);
	});


        // Gestion de l'overlay de chargement
        function showLoadingOverlay() {
                let overlay = document.querySelector('.background .loading-overlay');
                if (!overlay) {
                        overlay = document.createElement('div');
                        overlay.className = 'loading-overlay';
                        overlay.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">Chargement...</div>';
                        document.querySelector('.background').appendChild(overlay);
                }
        }


        function hideLoadingOverlay() {
                const overlay = document.querySelector('.background .loading-overlay');
                if (overlay) overlay.remove();
        }

        window.showLoadingOverlay = showLoadingOverlay;
        window.hideLoadingOverlay = hideLoadingOverlay;

        // Charger les détails d'un produit
        function loadProductDetails(productId) {
                console.log("productId :", productId);
                showLoadingOverlay();

                // Assure la présence du cache et du sous-objet 'variants'
                window.customizerCache = window.customizerCache || {};
                window.customizerCache.variants = window.customizerCache.variants || {};

                const cached = window.customizerCache.variants[productId];
                const fetchPromise = cached ? Promise.resolve(cached) : fetch(`${apiBaseURL}/${productId}`)
                        .then(response => {
                                if (!response.ok) {
                                        throw new Error(`Erreur serveur: ${response.status}`);
                                }
                                return response.json();
                        })
                        .then(productData => {
                                window.customizerCache.variants[productId] = productData;
                                persistCache();
                                return productData;
                        });

                fetchPromise.then(productData => {
                        currentVariants = productData.variants;
                        $('.description-content').html(productData.product_description || "<p>Description non disponible</p>");
                        updateProductDisplay(currentVariants);
                        console.group("🎨 Variantes disponibles (couleurs & tailles)");
                        currentVariants.forEach(v => {
                                console.log(`- ID: ${v.variant_id} | Couleur: ${v.color || '(aucune)'} | Taille: ${v.size || '(aucune)'} | Stock: ${v.stock}`);
                        });
                        console.groupEnd();
                }).catch(error => {
                        console.error("Erreur lors de la récupération du produit :", error);
                }).finally(() => {
                        hideLoadingOverlay();
                });
        }

        function updateProductDisplay(variants) {
                variants.forEach(v => {
                        v.mockups.sort((a, b) => a.mockup_id - b.mockup_id);
                });
                const urlParams = new URLSearchParams(window.location.search);
		const variantParam = urlParams.get('variant');
                selectedVariant = variants[0];

                updateColors(variants);
                updateSizes(variants);

                // Si aucun variant spécifique n'est indiqué, simule un clic sur
                // la première couleur et la première taille disponibles pour
                // appliquer correctement la sélection initiale
                if (!variantParam) {
                        const firstColor = $('.color-option:not(.disabled)').first();
                        if (firstColor.length) firstColor.trigger('click');
                        const firstSize = $('.size-option:not(.disabled)').first();
                        if (firstSize.length) firstSize.trigger('click');
                }

		// ✅ Si un paramètre variant est présent dans l'URL
		if (variantParam) {
			const foundVariant = variants.find(v => v.variant_id == variantParam);
			if (foundVariant) {
				selectedVariant = foundVariant;

				// 👉 Sélectionne automatiquement les bonnes options dans l'interface
				$('.color-option').removeClass('selected');
				$(`.color-option[data-color="${selectedVariant.color}"]`).addClass('selected');

				$('.size-option').removeClass('selected');
				$(`.size-option[data-size="${selectedVariant.size}"]`).addClass('selected');
			}
		}

		updateSelectedVariant();
	}


        function updateMainImage(variant) {
                if (variant.mockups.length > 0) {
                        currentMockup = getLatestMockup(variant);
                        mainProductImage.attr('src', currentMockup.mockup_image).css({
                                'position': 'absolute',
                                'top': `${currentMockup.position_top}%`,
                                'left': `${currentMockup.position_left}%`
                        });
                        $(document).trigger('mockupSelected', [selectedVariant, currentMockup]);

                }
        }

	function updateSelectedVariant() {
		const selectedColor = $('.color-option.selected').attr('data-color');
		const selectedSize = $('.size-option.selected').attr('data-size');

		const newVariant = currentVariants.find(variant =>
												(!selectedColor || variant.color === selectedColor) &&
												(!selectedSize || variant.size === selectedSize)
											   );

		if (newVariant) {
			selectedVariant = newVariant;

			// 🔄 Mise à jour de l'URL
			const url = new URL(window.location.href);
			url.searchParams.set("variant", selectedVariant.variant_id);
			history.replaceState(null, '', url.toString());

			updatePriceAndDelivery(selectedVariant);
			updateMainImage(selectedVariant);
			updateThumbnails([selectedVariant]);
			console.log("selectedVariant :", selectedVariant);

			// Gestion du stock
			const outOfStock = selectedVariant.stock === 'out of stock' || selectedVariant.stock === 'discontinued';

			$('#customize-button')
				.prop('disabled', outOfStock)
				.toggleClass('disabled', outOfStock);

			$('#no-stock-message').toggle(outOfStock);

			// Affichage des images communautaires selon le ratio
			const allImages = getAllCommunityImages();
			const filteredImages = allImages.filter(img => img.format === selectedVariant.ratio_image);
                        displayImagesInBottomBar(filteredImages);

                        // 🚀 Précharge les ressources du configurateur pour la variante courante
                        preloadVariantAssets(selectedVariant);

                        // 📢 Signale que la variante est prête pour d'autres scripts
                        $(document).trigger('variantReady', [selectedVariant]);
                } else {
			console.warn("Aucune variante trouvée pour cette combinaison !");
			$('#customize-button').prop('disabled', true).addClass('disabled');
			$('#no-stock-message').text("❌ Cette combinaison est indisponible.").show();
		}
	}



	function updateColors(variants) {
		const colorsContainer = $('.colors-container').empty();
		const colorSet = new Set();

		variants.forEach(v => {
			if (v.color) {
				colorSet.add(v.color);
			}
		});

		Array.from(colorSet).forEach((color, index) => {
			const isOutOfStock = !variants.some(v => v.color === color && v.stock !== 'out of stock' && v.stock !== 'discontinued');

			const colorOption = $('<div>')
			.addClass('color-option')
			.css('background-color', color)
			.attr('data-color', color)
			.toggleClass('disabled', isOutOfStock)
			.on('click', function () {
				if ($(this).hasClass('disabled')) return;
				$('.color-option').removeClass('selected');
				$(this).addClass('selected');
				updateSelectedVariant();
			});

			colorsContainer.append(colorOption);

			if (index === 0 && !isOutOfStock) {
				colorOption.addClass('selected');
			}
		});
		// ✅ Affichage conditionnel
		if (colorSet.size <= 1) {
			$('.product-colors').hide();
		} else {
			$('.product-colors').show();
		}

	}



        function updateSizes(variants) {
                const sizesContainer = $('.sizes-container').empty();
                const seenSizes = new Set();
                const orderedSizes = [];

                variants.forEach(v => {
                        if (v.size && !seenSizes.has(v.size)) {
                                seenSizes.add(v.size);
                                orderedSizes.push({ size: v.size, stock: v.stock });
                        }
                });

                orderedSizes.forEach(({ size, stock }, index) => {
                        const sizeOption = $('<div>')
                        .addClass('size-option')
                        .text(size)
                        .attr('data-size', size)
                        .toggleClass('disabled', stock === 'out of stock' || stock === 'discontinued')
			.on('click', function () {
				if ($(this).hasClass('disabled')) return;
				$('.size-option').removeClass('selected');
				$(this).addClass('selected');
				updateSelectedVariant();
			});

			sizesContainer.append(sizeOption);
			if (index === 0 && !sizeOption.hasClass('disabled')) {
				sizeOption.addClass('selected');
			}
		});
	}

	function updatePriceAndDelivery(variant) {
		const priceHT = variant.price ? variant.price : 0;
		const priceTTC = priceHT * 1.20; // ✅ Ajoute la TVA de 20%
		const discountedPriceTTC = priceTTC * 0.95; // ✅ 5% de remise sur TTC

		$('.price-value span').text(priceTTC ? priceTTC.toFixed(2) + " € TTC" : "--");
		$('.discounted-price span').text(priceTTC ? discountedPriceTTC.toFixed(2) + " € TTC" : "--");
		$('.delivery-time span').text(variant.delivery_time || "--");
		$('.shipping-cost span').text(variant.delivery_price ? parseFloat(variant.delivery_price).toFixed(2) + " €" : "--");
	}


        function updateThumbnails(variants) {
                const thumbnailsContainer = $('.image-thumbnails').empty();

                variants.forEach(variant => {
                        variant.mockups.sort((a, b) => a.mockup_id - b.mockup_id);
                        variant.mockups.forEach((mockup, index) => {
                                const imgElement = $('<img>')
                                .addClass('thumbnail')
                                .attr('src', mockup.mockup_image)
                                .attr('data-style-id', mockup.mockup_id)
                                .on('click', function () {
                                        currentMockup = mockup;
                                        mainProductImage.attr('src', $(this).attr('src')).css({
                                                'top': `${mockup.position_top}%`,
                                                'left': `${mockup.position_left}%`
                                        });
                                        $('.image-thumbnails .thumbnail').removeClass('selected');
                                        $(this).addClass('selected');
                                        $(document).trigger('mockupSelected', [selectedVariant, currentMockup]);
                                });

				thumbnailsContainer.append(imgElement);

				if (index === 0) imgElement.addClass('selected');
			});
		});
	}

        // 🔥 Ecoute l'événement personnalisé envoyé par le dropdown
        $(document).on('productSelected', function (event, productId) {
                showLoadingOverlay();
                loadProductDetails(productId);
        });
	// ✅ Permet d'ouvrir ou fermer la description détaillée du produit
	$(document).on('click', '.toggle-description', function () {
		$('.description-content').toggleClass('open');
	});


	// 🔥 Charge le produit si un ID est présent au démarrage
	const urlParams = new URLSearchParams(window.location.search);
	currentProductId = urlParams.get('id');
	if (currentProductId) {
		loadProductDetails(currentProductId);
	}
	// 🔄 Auto-génération du mockup si mockup=1
	if (urlParams.get("mockup") === "1") {
		const imageUrl = urlParams.get("image_url");
		const variantId = urlParams.get("variant");

		// ⏳ Attendre que les variantes soient chargées
		const checkReady = setInterval(() => {
			if (selectedVariant && selectedVariant.variant_id == variantId) {
				clearInterval(checkReady);

				const mockupData = {
					image_url: imageUrl,
					product_id: currentProductId,
					variant_id: selectedVariant.variant_id,
					placement: selectedVariant.placement,
					technique: selectedVariant.technique,
					width: selectedVariant.print_area_width,
					height: selectedVariant.print_area_height,
					left: 0,
					top: 0
				};

				console.log("🚀 Déclenchement automatique de generateMockup :", mockupData);
				generateMockup(mockupData);
			}
		}, 200);
	}

});
