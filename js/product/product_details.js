let selectedVariant = null;
let myGeneratedImages = [];
let communityImages = [];
window.currentProductId = window.currentProductId || null;
let currentMockup = null;

// Certains produits n'ont qu'un seul mockup initial pertinent
const SINGLE_MOCKUP_PRODUCTS = [382, 585];
// Au-delà de ce seuil on teste un sélecteur plutôt que des boutons taille
const PRODUCT_SIZE_SELECT_THRESHOLD = 6;

function shouldShowSingleMockup() {
    return SINGLE_MOCKUP_PRODUCTS.includes(parseInt(window.currentProductId));
}

function dedupeMockups(mockups) {
    if (!Array.isArray(mockups)) {
        return [];
    }

    const seen = new Set();
    return mockups.filter(m => {
        if (seen.has(m.mockup_image)) return false;
        seen.add(m.mockup_image);
        return true;
    });
}

function getFirstMockup(variant) {
    if (!variant.mockups || !variant.mockups.length) return null;
    const unique = dedupeMockups(variant.mockups);
    return unique[0];
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
window.customizerCache.designs = window.customizerCache.designs || {};

function persistCache() {
    const tmp = { ...window.customizerCache, models: {} };
    sessionStorage.setItem('customizerCache', JSON.stringify(tmp));
}

const DESIGN_CACHE_MIRROR_FIELDS = [
    'product_name',
    'product_price',
    'delivery_price',
    'mockup_url',
    'design_image_url',
    'canvas_image_url',
    'design_width',
    'design_height',
    'design_left',
    'design_top',
    'design_angle',
    'design_flipX',
    'canvas_state',
    'variant_id',
    'placement',
    'technique',
    'product_id'
];

const DESIGN_CACHE_NUMERIC_FIELDS = ['design_left', 'design_top', 'design_width', 'design_height', 'design_angle'];

function cloneDesignData(data) {
    if (!data) return null;
    try {
        return JSON.parse(JSON.stringify(data));
    } catch (err) {
        const clone = {};
        Object.keys(data || {}).forEach((key) => {
            clone[key] = data[key];
        });
        return clone;
    }
}

function computePlacementKey(designUrl) {
    if (!designUrl || typeof designUrl !== 'string') return null;
    const trimmed = designUrl.trim();
    if (trimmed.startsWith('data:')) {
        const fragment = trimmed.slice(0, 512);
        let hash = 0;
        for (let i = 0; i < fragment.length; i++) {
            hash = (hash * 31 + fragment.charCodeAt(i)) >>> 0;
        }
        return `data:${hash.toString(16)}`;
    }
    return trimmed;
}

function mirrorEntryFields(entry, data) {
    DESIGN_CACHE_MIRROR_FIELDS.forEach((field) => {
        if (data && data[field] !== undefined) {
            entry[field] = data[field];
        } else {
            delete entry[field];
        }
    });
}

function buildPlacementPayload(data) {
    if (!data) return null;
    const placement = {};
    DESIGN_CACHE_NUMERIC_FIELDS.forEach((field) => {
        if (data[field] === undefined || data[field] === null || data[field] === '') return;
        const value = Number(data[field]);
        if (!Number.isNaN(value)) {
            placement[field] = value;
        }
    });
    if (typeof data.design_flipX !== 'undefined') {
        placement.design_flipX = !!data.design_flipX;
    }
    if (data.placement) {
        placement.placement = data.placement;
    }
    if (data.technique) {
        placement.technique = data.technique;
    }
    if (data.variant_id !== undefined && data.variant_id !== null && data.variant_id !== '') {
        placement.variant_id = String(data.variant_id);
    }
    return Object.keys(placement).length ? placement : null;
}

function ensureDesignEntry(productId) {
    if (!productId) return null;
    window.customizerCache.designs = window.customizerCache.designs || {};
    let entry = window.customizerCache.designs[productId];
    const isObject = entry && typeof entry === 'object' && !Array.isArray(entry);

    if (!isObject) {
        entry = { placements: {}, last: null };
    } else if (entry.design_image_url && !entry.last) {
        const legacy = entry;
        entry = { placements: {}, last: cloneDesignData(legacy) };
        if (legacy.product_id) {
            entry.product_id = legacy.product_id;
        }
        const legacyPlacement = buildPlacementPayload(legacy);
        const legacyKey = computePlacementKey(legacy.design_image_url);
        if (legacyPlacement && legacyKey) {
            entry.placements[legacyKey] = entry.placements[legacyKey] || {};
            const variantKey = legacyPlacement.variant_id || '_default';
            entry.placements[legacyKey][variantKey] = legacyPlacement;
        }
    } else {
        entry.placements = entry.placements || {};
        if (entry.last && entry.last.design_image_url) {
            if (!entry.last.canvas_image_url) {
                entry.last.canvas_image_url = entry.last.design_image_url;
            }
            const currentPlacement = buildPlacementPayload(entry.last);
            const currentKey = computePlacementKey(entry.last.design_image_url);
            if (currentPlacement && currentKey) {
                entry.placements[currentKey] = entry.placements[currentKey] || {};
                const variantKey = currentPlacement.variant_id || '_default';
                entry.placements[currentKey][variantKey] = currentPlacement;
            }
        }
    }

    mirrorEntryFields(entry, entry.last);
    window.customizerCache.designs[productId] = entry;
    return entry;
}

function storePlacement(entry, data) {
    if (!entry || !data) return;
    const placement = buildPlacementPayload(data);
    if (!placement) return;

    const keys = [];
    const canvasKey = computePlacementKey(data.canvas_image_url);
    if (canvasKey) keys.push(canvasKey);
    const designKey = computePlacementKey(data.design_image_url);
    if (designKey && !keys.includes(designKey)) keys.push(designKey);
    if (!keys.length) return;

    entry.placements = entry.placements || {};
    const variantKey = placement.variant_id || '_default';

    keys.forEach((key) => {
        entry.placements[key] = entry.placements[key] || {};
        entry.placements[key][variantKey] = { ...placement };
    });
}

function saveDesignToCache(productId, productData) {
    if (!productId) return null;
    const entry = ensureDesignEntry(productId) || { placements: {}, last: null };
    const clone = cloneDesignData(productData);
    if (clone) {
        if (!clone.canvas_image_url && clone.design_image_url) {
            clone.canvas_image_url = clone.design_image_url;
        }
        if (!clone.product_id && productId) {
            clone.product_id = String(productId);
        }
        if (!Array.isArray(clone.canvas_state)) {
            clone.canvas_state = [];
        } else {
            clone.canvas_state = clone.canvas_state
                .filter(layer => layer && typeof layer === 'object');
        }
    }
    entry.last = clone;
    if (clone && clone.product_id) {
        entry.product_id = clone.product_id;
    }
    if (clone) {
        storePlacement(entry, clone);
    }
    mirrorEntryFields(entry, clone);
    window.customizerCache.designs[productId] = entry;
    if (typeof persistCache === 'function') {
        try { persistCache(); } catch (e) {}
    }
    return entry.last;
}

function updateDesignProductId(productId, productIdValue) {
    if (!productId || !productIdValue) return;
    const entry = ensureDesignEntry(productId);
    if (!entry) return;
    entry.product_id = productIdValue;
    if (entry.last) {
        entry.last.product_id = productIdValue;
    }
    mirrorEntryFields(entry, entry.last);
    if (typeof persistCache === 'function') {
        try { persistCache(); } catch (e) {}
    }
}

function getLastDesignFromCache(productId) {
    const entry = ensureDesignEntry(productId);
    return entry ? entry.last : null;
}

function getPlacementForImage(productId, imageUrl, variantId) {
    if (!productId || !imageUrl) return null;
    const entry = ensureDesignEntry(productId);
    if (!entry) return null;
    const key = computePlacementKey(imageUrl);
    if (!key) return null;
    const perImage = entry.placements?.[key];
    if (!perImage) return null;
    const variantKey = variantId !== undefined && variantId !== null ? String(variantId) : '_default';
    const placement = perImage[variantKey] || perImage['_default'];
    return placement ? { ...placement } : null;
}

window.DesignCache = {
    saveDesign: saveDesignToCache,
    updateProductId: updateDesignProductId,
    getLastDesign: getLastDesignFromCache,
    getPlacement: getPlacementForImage,
    ensureEntry: ensureDesignEntry
};

try {
    Object.keys(window.customizerCache.designs || {}).forEach((pid) => ensureDesignEntry(pid));
    if (typeof persistCache === 'function') {
        persistCache();
    }
} catch (e) {}
jQuery(document).ready(function ($) {
        const apiBaseURL = '/wp-json/api/v1/products';
        const mainProductImage = $('#product-main-image');

        let currentVariants = [];
        let main3DInitialized = false;

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
                        }, undefined, (err) => {
                                console.error('[Cache] Erreur préchargement modèle 3D:', err);
                        });
                }
        }

        // Dès le chargement général de la page
        // On transmet l'ID utilisateur pour récupérer correctement
        // l'état des favoris depuis l'API
        preloadCommunityImages({ user_id: currentUser.ID }).then(() => {
                const images = getAllCommunityImages();
                myGeneratedImages = images.filter(img => img.user_id === currentUser.ID);
                communityImages = images.filter(img => img.user_id !== currentUser.ID);

                if (window.FileLibrary) {
                        FileLibrary.setMyImages(myGeneratedImages);
                        FileLibrary.setCommunityImages(communityImages);
                }

                // Si une variante est déjà sélectionnée, met à jour la bottom-bar
                if (selectedVariant) {
                        const filtered = images.filter(img => img.format === selectedVariant.ratio_image);
                        displayImagesInBottomBar(filtered);
                }
        });

        // Met à jour la bottom-bar dès que les images communautaires sont chargées
        document.addEventListener('communityImagesLoaded', () => {
                if (!selectedVariant) return;
                const images = getAllCommunityImages();
                const filtered = images.filter(img => img.format === selectedVariant.ratio_image);
                displayImagesInBottomBar(filtered);
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
                        v.mockups = dedupeMockups(v.mockups);
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
                        const sizeSelector = $('.size-selector');
                        if (sizeSelector.length) {
                                const firstSelectable = sizeSelector.find('option:not([disabled])').first();
                                if (firstSelectable.length) {
                                        sizeSelector.val(firstSelectable.val());
                                        sizeSelector.trigger('change');
                                }
                        } else {
                                const firstSize = $('.size-option:not(.disabled)').first();
                                if (firstSize.length) firstSize.trigger('click');
                        }
                }

                // ✅ Si un paramètre variant est présent dans l'URL
                if (variantParam) {
                        const foundVariant = variants.find(v => v.variant_id == variantParam);
			if (foundVariant) {
				selectedVariant = foundVariant;

				// 👉 Sélectionne automatiquement les bonnes options dans l'interface
				$('.color-option').removeClass('selected');
				$(`.color-option[data-color="${selectedVariant.color}"]`).addClass('selected');

                                const sizeSelector = $('.size-selector');
                                if (sizeSelector.length) {
                                        sizeSelector.val(selectedVariant.size);
                                        sizeSelector.trigger('change');
                                } else {
                                        $('.size-option').removeClass('selected');
                                        $(`.size-option[data-size="${selectedVariant.size}"]`).addClass('selected');
                                }
                        }
                }

		updateSelectedVariant();
	}


        function updateMainImage(variant) {
                if (variant.mockups.length > 0) {
                        currentMockup = getFirstMockup(variant);
                        mainProductImage.attr('src', currentMockup.mockup_image).css({
                                'position': 'absolute',
                                'top': `${currentMockup.position_top}%`,
                                'left': `${currentMockup.position_left}%`
                        });
                        // 🆕 Aligne le conteneur 3D sur l'image principale
                        jQuery('#productMain3DContainer').css({
                                'top': `${currentMockup.position_top}%`,
                                'left': `${currentMockup.position_left}%`
                        });
                        $(document).trigger('mockupSelected', [selectedVariant, currentMockup]);

                }
        }

	function updateSelectedVariant() {
                const selectedColor = $('.color-option.selected').attr('data-color');
                const sizeSelector = $('.size-selector');
                const selectedSizeFromSelect = sizeSelector.length ? sizeSelector.val() : null;
                const selectedSize = $('.size-option.selected').attr('data-size') || selectedSizeFromSelect;

		const newVariant = currentVariants.find(variant =>
												(!selectedColor || variant.color === selectedColor) &&
												(!selectedSize || variant.size === selectedSize)
											   );

		if (newVariant) {
                        selectedVariant = newVariant;

                        if (sizeSelector.length && selectedVariant.size) {
                                sizeSelector.val(selectedVariant.size);
                        }

			// 🔄 Mise à jour de l'URL
			const url = new URL(window.location.href);
			url.searchParams.set("variant", selectedVariant.variant_id);
			history.replaceState(null, '', url.toString());

			updatePriceAndDelivery(selectedVariant);
			updateMainImage(selectedVariant);
			updateThumbnails([selectedVariant]);

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
                sizesContainer.removeClass('sizes-select-mode');
                const seenSizes = new Set();
                const orderedSizes = [];

                variants.forEach(v => {
                        if (v.size && !seenSizes.has(v.size)) {
                                seenSizes.add(v.size);
                                orderedSizes.push({ size: v.size, stock: v.stock });
                        }
                });

                const shouldUseSelect = orderedSizes.length > PRODUCT_SIZE_SELECT_THRESHOLD;

                if (shouldUseSelect) {
                        sizesContainer.addClass('sizes-select-mode');
                        const selectWrapper = $('<div>').addClass('size-select-wrapper');
                        const selectElement = $('<select>').addClass('size-selector');

                        const placeholder = $('<option>')
                                .val('')
                                .text('Sélectionner une taille')
                                .prop('disabled', true)
                                .prop('hidden', true);
                        selectElement.append(placeholder);

                        orderedSizes.forEach(({ size, stock }) => {
                                const isDisabled = stock === 'out of stock' || stock === 'discontinued';
                                const option = $('<option>')
                                        .val(size)
                                        .text(size)
                                        .attr('data-size', size);

                                if (isDisabled) option.prop('disabled', true);
                                selectElement.append(option);
                        });

                        const preferredSize = selectedVariant && orderedSizes.some(entry => entry.size === selectedVariant.size)
                                ? selectedVariant.size
                                : null;

                        let defaultSize = preferredSize;
                        if (defaultSize) {
                                const preferredEntry = orderedSizes.find(entry => entry.size === defaultSize);
                                if (preferredEntry && (preferredEntry.stock === 'out of stock' || preferredEntry.stock === 'discontinued')) {
                                        defaultSize = null;
                                }
                        }
                        if (!defaultSize) {
                                const firstAvailable = orderedSizes.find(({ stock }) => stock !== 'out of stock' && stock !== 'discontinued');
                                if (firstAvailable) defaultSize = firstAvailable.size;
                        }

                        if (defaultSize) {
                                selectElement.val(defaultSize);
                        }

                        selectElement.on('change', function () {
                                if (!$(this).val()) return;
                                updateSelectedVariant();
                        });

                        selectWrapper.append(selectElement);
                        sizesContainer.append(selectWrapper);
                } else {
                        // Ancien affichage avec des boutons individuels
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
        }

	function updatePriceAndDelivery(variant) {
		const priceHT = variant.price ? variant.price : 0;
		const priceTTC = priceHT * 1.20; // ✅ Ajoute la TVA de 20%
		const discountedPriceTTC = priceTTC * 0.95; // ✅ 5% de remise sur TTC

                $('.price-value span').text(priceTTC ? priceTTC.toFixed(2) : "--");
                $('.discounted-price span').text(priceTTC ? discountedPriceTTC.toFixed(2) : "--");
                $('.delivery-time span').text(variant.delivery_time || "--");

                const shippingHT = variant.delivery_price ? parseFloat(variant.delivery_price) : 0;
                const shippingTTC = shippingHT * 1.20;
                $('.shipping-cost span').text(shippingHT ? shippingTTC.toFixed(2) : "--");
        }


        function updateThumbnails(variants) {
                const thumbnailsContainer = $('.image-thumbnails').empty();
                // 🧹 Réinitialise l'affichage 3D
                jQuery('#productMain3DContainer').hide();
                mainProductImage.show();
                main3DInitialized = false;

                const hideExtra = shouldShowSingleMockup();

                variants.forEach(variant => {
                        const uniqueMockups = dedupeMockups(variant.mockups);
                        const displayMockups = hideExtra ? uniqueMockups.slice(0, 1) : uniqueMockups;
                        displayMockups.forEach((mockup, index) => {
                                const imgElement = $('<img>')
                                .addClass('thumbnail')
                                .attr('src', mockup.mockup_image)
                                .attr('data-style-id', mockup.mockup_id)
                                .attr('data-view-name', mockup.view_name)
                                .on('click', function () {
                                        currentMockup = mockup;
                                        mainProductImage.attr('src', $(this).attr('src')).css({
                                                'top': `${mockup.position_top}%`,
                                                'left': `${mockup.position_left}%`
                                        });
                                        jQuery('#productMain3DContainer').hide();
                                        mainProductImage.show();
                                        $('.image-thumbnails .thumbnail').removeClass('selected');
                                        $(this).addClass('selected');
                                        $(document).trigger('mockupSelected', [selectedVariant, currentMockup]);
                                });

                                thumbnailsContainer.append(imgElement);

                                if (index === 0) imgElement.addClass('selected');
                        });
                });

                // 🆕 Ajoute une vignette pour l'affichage 3D si disponible
                const variant = variants[0];
                if (variant && variant.url_3d) {
                        const threeDThumb = $('<div>')
                                .addClass('thumbnail three-d-thumb')
                                .text('3D')
                                .on('click', function () {
                                        $('.image-thumbnails .thumbnail').removeClass('selected');
                                        $(this).addClass('selected');
                                        mainProductImage.hide();
                                        const container = jQuery('#productMain3DContainer');
                                        container.show();
                                        if (!main3DInitialized) {
                                                requestAnimationFrame(() => {
                                                        init3DScene('productMain3DContainer', variant.url_3d, variant.color, 'productMain3DCanvas');
                                                });
                                                main3DInitialized = true;
                                        }
                                });
                        thumbnailsContainer.append(threeDThumb);
                }

                // 🚀 S'assure que le thumbnail sélectionné déclenche bien ses évènements
                const selectedThumb = thumbnailsContainer.find('.thumbnail.selected');
                if (selectedThumb.length) selectedThumb.trigger('click');
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

        $(document).on('mockupSelected', function (e, variant, mockup) {
                let designUrl = null;
                if (typeof productData !== 'undefined') {
                        if (productData?.canvas_image_url) {
                                designUrl = productData.canvas_image_url;
                        } else if (productData?.design_image_url) {
                                designUrl = productData.design_image_url;
                        }
                }

                if (!designUrl && window.DesignCache?.getLastDesign) {
                        const cachedDesign = window.DesignCache.getLastDesign(window.currentProductId);
                        if (cachedDesign?.canvas_image_url) {
                                designUrl = cachedDesign.canvas_image_url;
                        } else if (cachedDesign?.design_image_url) {
                                designUrl = cachedDesign.design_image_url;
                        }
                }

                if (!designUrl && window.customizerCache?.designs?.[window.currentProductId]) {
                        const cached = window.customizerCache.designs[window.currentProductId];
                        if (cached?.canvas_image_url) {
                                designUrl = cached.canvas_image_url;
                        } else if (cached?.design_image_url) {
                                designUrl = cached.design_image_url;
                        }
                }
                if (designUrl && typeof window.update3DTextureFromImageURL === 'function') {
                        window.update3DTextureFromImageURL(designUrl, variant?.zone_3d_name || null);
                }
        });

       function mobileReorder() {
        const isMobile = window.innerWidth <= 1024;
               const background = $('.background');
               const selector = $('.product-selector');
               const mainImage = $('#product-main-image');
               const thumbnails = $('.image-thumbnails');
               const productInfo = $('.product-info');
               const productDetails = $('.product-details');

               if (!selector.length || !mainImage.length) return;

               if (isMobile) {
                       if (selector.parent()[0] !== background[0]) {
                               selector.detach();
                               selector.insertBefore(mainImage);
                       }
                       if (thumbnails.prev()[0] !== mainImage[0]) {
                               thumbnails.detach();
                               thumbnails.insertAfter(mainImage);
                       }
               } else {
                       if (selector.parent()[0] !== productInfo[0]) {
                               selector.detach();
                               selector.prependTo(productInfo);
                       }
                       if (thumbnails.parent()[0] !== background[0] || thumbnails.prev()[0] !== productDetails[0]) {
                               thumbnails.detach();
                               thumbnails.insertAfter(productDetails);
                       }
               }
       }

       mobileReorder();
       $(window).on('resize', mobileReorder);


	// 🔥 Charge le produit si un ID est présent au démarrage
        const urlParams = new URLSearchParams(window.location.search);
        window.currentProductId = urlParams.get('id');
        if (window.currentProductId) {
                loadProductDetails(window.currentProductId);
        }
        // 🔄 Auto-génération du mockup si mockup=1
        if (urlParams.get("mockup") === "1") {
                const imageUrl = urlParams.get("image_url");
                const variantId = urlParams.get("variant");

                // 🧹 Nettoie l'URL pour éviter une nouvelle génération au rafraîchissement
                const clearMockupParams = () => {
                        urlParams.delete("mockup");
                        urlParams.delete("image_url");
                        urlParams.delete("variant");
                        const newQuery = urlParams.toString();
                        const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : "");
                        window.history.replaceState({}, "", newUrl);
                };

                // ⏳ Attendre que les variantes soient chargées
                const checkReady = setInterval(() => {
                        if (selectedVariant && selectedVariant.variant_id == variantId) {
                                clearInterval(checkReady);

                                const applyImageToCustomizer = () => {
                                        const addToCanvas = () => {
                                                if (typeof CanvasManager === 'undefined') return;
                                                const activeVariant = (typeof selectedVariant !== 'undefined' && selectedVariant) ? selectedVariant : window.selectedVariant;
                                                const placement = window.DesignCache?.getPlacement
                                                        ? window.DesignCache.getPlacement(window.currentProductId, imageUrl, activeVariant?.variant_id)
                                                        : null;
                                                const afterAdd = () => {
                                                        const addImageButton = jQuery('#addImageButton');
                                                        const imageControls = jQuery('.image-controls');
                                                        const visualHeader = jQuery('.visual-header');

                                                        addImageButton.hide();
                                                        imageControls.css('display', 'flex').show();
                                                        visualHeader.css('display', 'flex');
                                                        jQuery('.visual-zone').addClass('with-header');
                                                        CanvasManager.resizeToContainer('product2DContainer');
                                                };
                                                if (placement) {
                                                        CanvasManager.addImage(imageUrl, { placement }, afterAdd);
                                                } else {
                                                        CanvasManager.addImage(imageUrl, afterAdd);
                                                }
                                        };

                                        if (jQuery('#customizeModal').is(':visible')) {
                                                addToCanvas();
                                        } else {
                                                const designButton = document.querySelector('.design-button');
                                                if (designButton) {
                                                        window.skipDesignRestoreOnce = true;
                                                        designButton.click();
                                                        const interval = setInterval(() => {
                                                                if (document.getElementById('productCanvas')) {
                                                                        clearInterval(interval);
                                                                        addToCanvas();
                                                                }
                                                        }, 100);
                                                        setTimeout(() => clearInterval(interval), 10000);
                                                } else {
                                                        window.skipDesignRestoreOnce = false;
                                                }
                                        }
                                };

                                applyImageToCustomizer();
                                clearMockupParams();
                        }
                }, 200);
        }

});
