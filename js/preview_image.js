let knownDbRatios = new Set();

function buildVariantLabel(variant) {
        if (!variant || typeof variant !== 'object') {
                return '';
        }

        const parts = [];

        if (variant.variant_size) {
                parts.push(variant.variant_size);
        }

        if (parts.length === 0 && variant.variant_id) {
                parts.push(`Variante ${variant.variant_id}`);
        }

        if (parts.length === 0) {
                return 'Variante disponible';
        }

        return parts.join(' – ');
}

function renderFormatProductList(container, grouped, productIds) {
        if (!container) {
                return;
        }

        container.innerHTML = '';

        if (!Array.isArray(productIds) || productIds.length === 0) {
                return;
        }

        const productList = document.createElement('div');
        productList.classList.add('format-product-list');

        productIds.forEach((productId) => {
                const product = grouped[productId];
                if (!product || !product.name) {
                        return;
                }

                const productBlock = document.createElement('div');
                productBlock.classList.add('format-product-item');

                const productNameEl = document.createElement('div');
                productNameEl.classList.add('format-product-name');
                productNameEl.textContent = product.name;
                productBlock.appendChild(productNameEl);

                const variants = Array.isArray(product.variants) ? product.variants : [];
                const variantList = document.createElement('ul');
                variantList.classList.add('format-variant-list');
                const seenKeys = new Set();

                variants.forEach((variant) => {
                        if (!variant) {
                                return;
                        }
                        const variantKey = variant.variant_id || (variant.variant_size || '').toLowerCase();
                        if (variantKey && seenKeys.has(variantKey)) {
                                return;
                        }
                        if (variantKey) {
                                seenKeys.add(variantKey);
                        }

                        const label = buildVariantLabel(variant);
                        if (!label) {
                                return;
                        }

                        const variantItem = document.createElement('li');
                        variantItem.classList.add('format-variant-item');
                        variantItem.textContent = label;
                        variantList.appendChild(variantItem);
                });

                if (variantList.children.length > 0) {
                        productBlock.appendChild(variantList);
                }

                productList.appendChild(productBlock);
        });

        if (productList.children.length > 0) {
                container.appendChild(productList);
        }
}

function normalizeFormatValue(value) {
    const raw = (value || '').toString().trim();
    if (!raw) {
        return '';
    }

    if (raw.toLowerCase() === 'inconnu') {
        return '';
    }

    return raw;
}

function collectRatiosFromCacheSources() {
    const ratios = new Set();

    const addRatio = (ratio) => {
        const normalized = normalizeFormatValue(ratio);
        if (normalized) {
            ratios.add(normalized);
        }
    };

    const variantBasics = window.customizerCache?.variantBasics;
    if (variantBasics && typeof variantBasics === 'object') {
        Object.values(variantBasics).forEach((variants) => {
            (Array.isArray(variants) ? variants : []).forEach((variant) => {
                addRatio(variant?.ratio_image);
            });
        });
    }

    const variantDetails = window.customizerCache?.variants;
    if (variantDetails && typeof variantDetails === 'object') {
        Object.values(variantDetails).forEach((productEntry) => {
            const productVariants = productEntry?.variants;
            (Array.isArray(productVariants) ? productVariants : []).forEach((variant) => {
                addRatio(variant?.ratio_image);
            });
        });
    }

    const formatProducts = window.customizerCache?.formatProducts;
    if (formatProducts && typeof formatProducts === 'object') {
        Object.keys(formatProducts).forEach(addRatio);
    }
    return ratios;
}

function refreshKnownDbRatios() {
    knownDbRatios = collectRatiosFromCacheSources();
    return knownDbRatios;
}

function getProductUsageDetailsForFormat(format) {
        const normalizedFormat = normalizeFormatValue(format);
        const cache = window.formatProductsCache;

        if (!normalizedFormat) {
                return { success: false, reason: 'format-missing', format: normalizedFormat };
        }

        if (!cache) {
                return { success: false, reason: 'cache-missing', format: normalizedFormat };
        }

        const cached = cache.get(normalizedFormat);
        if (typeof cached === 'undefined') {
                return { success: false, reason: 'format-unknown', format: normalizedFormat };
        }

        if (!cached || !cached.success || !Array.isArray(cached.choices) || cached.choices.length === 0) {
                return { success: false, reason: 'no-choices', format: normalizedFormat };
        }

        const grouped = {};
        cached.choices.forEach((choice) => {
                if (!choice || typeof choice.product_id === 'undefined' || !choice.product_name) {
                        return;
                }

                const productKey = String(choice.product_id);
                if (!grouped[productKey]) {
                        grouped[productKey] = {
                                name: choice.product_name,
                                variants: [],
                        };
                }

                grouped[productKey].variants.push(choice);
        });

        const productIds = Object.keys(grouped).filter((id) => {
                const product = grouped[id];
                if (!product || !product.name) {
                        delete grouped[id];
                        return false;
                }

                product.variants = (Array.isArray(product.variants) ? product.variants : []).filter(Boolean);
                return product.variants.length > 0;
        });

        if (productIds.length === 0) {
                return {
                        success: false,
                        reason: 'no-valid-products',
                        format: normalizedFormat,
                        grouped,
                        choices: cached.choices,
                };
        }

        return {
                success: true,
                format: normalizedFormat,
                grouped,
                productIds,
                choices: cached.choices,
        };
}

function launchProductUsageFromDetails(details, { src, prompt, format, productNameOverride = null } = {}) {
        if (!details || !details.success) {
                return { success: false, reason: details ? details.reason : 'invalid-details' };
        }

        const normalizedFormat = normalizeFormatValue(format || details.format);
        const { grouped, productIds } = details;

        if (!Array.isArray(productIds) || productIds.length === 0) {
                return { success: false, reason: 'no-valid-products', format: normalizedFormat };
        }

        if (productIds.length === 1) {
                const group = grouped[productIds[0]];
                if (!group || !Array.isArray(group.variants) || group.variants.length === 0) {
                        return { success: false, reason: 'no-valid-products', format: normalizedFormat };
                }

                if (group.variants.length === 1) {
                        const variant = group.variants[0];
                        redirectToConfigurator(
                                productNameOverride || group.name,
                                variant.product_id,
                                src,
                                prompt,
                                normalizedFormat,
                                variant.variant_id,
                        );
                        return {
                                success: true,
                                mode: 'redirect',
                                format: normalizedFormat,
                                productId: variant.product_id,
                                variantId: variant.variant_id,
                        };
                }

                showProductChooserOverlay(
                        group.variants,
                        src,
                        prompt,
                        normalizedFormat,
                        productNameOverride || group.name,
                );
                return {
                        success: true,
                        mode: 'chooser',
                        format: normalizedFormat,
                        productCount: 1,
                };
        }

        const allVariants = productIds.flatMap((id) => {
                const group = grouped[id];
                return group && Array.isArray(group.variants) ? group.variants : [];
        });

        showProductChooserOverlay(allVariants, src, prompt, normalizedFormat);
        return {
                success: true,
                mode: 'chooser',
                format: normalizedFormat,
                productCount: productIds.length,
        };
}

function startImageProductUsageFlow({ src, prompt, format, productNameOverride = null } = {}) {
        const details = getProductUsageDetailsForFormat(format);
        if (!details.success) {
                return details;
        }

        return launchProductUsageFromDetails(details, {
                src,
                prompt,
                format: details.format,
                productNameOverride,
        });
}

window.startImageProductUsageFlow = startImageProductUsageFlow;

document.addEventListener('DOMContentLoaded', () => {
    const cache = window.formatProductsCache;
    if (!cache) {
        return;
    }

    const ratios = Array.from(refreshKnownDbRatios());
    if (ratios.length === 0) {
        console.warn('[preview] aucun ratio issu de la base pour précharger le cache formats');
        return;
    }

    const missing = ratios.filter((format) => typeof cache.get(format) === 'undefined');

    if (missing.length === 0) {
        console.log('[preview] tous les ratios DB sont déjà en cache', { formats: ratios.length });
        return;
    }

    console.log('[preview] préchargement des ratios manquants', { formats: missing.length });
    cache.preloadFormats(missing);
});


function enableImageEnlargement() {
        // D'abord retirer l'ancien event listener si présent
        document.removeEventListener('click', handleImageClick);

        // Puis ajouter le nouvel event listener
        document.addEventListener('click', handleImageClick);
}

// Séparer ta fonction de clic proprement
function handleImageClick(event) {

	const image = event.target.closest('img.preview-enlarge');
	if (!image) return;

	// Sélection active ➔ charger dans le cropper
	if (typeof isSelectingImage !== 'undefined' && isSelectingImage) {
		const src = image.getAttribute('src');

		showElement('modalChoixImage'); // Ouvrir crop modal

		resetCropper();
		setImagePreview(src, function() {
			initializeCropper();
		});

		isSelectingImage = false;

		// Pas d'openImageOverlay
		return;
	}

	// Mode normal : ouvrir l'overlay
        const src = image.getAttribute('src');
        const username = image.getAttribute('data-display_name') || 'Inconnu';
        const userId = image.getAttribute('data-user-id') || 'Inconnu';
        const formatImage = image.getAttribute('data-format-image') || 'Inconnu';
        let rawPrompt = image.getAttribute('data-prompt');
        if (rawPrompt) {
                try {
                        const obj = JSON.parse(rawPrompt);
                        rawPrompt = obj.text || obj.prompt || rawPrompt;
                } catch (e) {
                        // keep rawPrompt as is
                }
        } else {
                rawPrompt = 'Aucun prompt disponible';
        }

        const prompt = rawPrompt;

	openImageOverlay(src, userId, username, formatImage, prompt);
}



function openImageOverlay(src, userId, username, formatImage, prompt) {
        const targetFormat = normalizeFormatValue(formatImage);
        const dbRatios = refreshKnownDbRatios();
        const cacheInstance = window.formatProductsCache || null;
        const initialCachedEntry = cacheInstance && targetFormat ? cacheInstance.get(targetFormat) : undefined;
        const hasInitialCache = typeof initialCachedEntry !== 'undefined';
        const isDbRatio = targetFormat ? dbRatios.has(targetFormat) : false;

        console.log('[preview] ouverture overlay', {
                format: targetFormat || null,
                userId,
                knownInDb: isDbRatio,
                hasCachedEntry: hasInitialCache
        });

        const overlay = document.createElement('div');
        overlay.classList.add('preview-overlay');

	const mainContainer = document.createElement('div');
	mainContainer.classList.add('preview-main-container');

	const imageContainer = document.createElement('div');
	imageContainer.classList.add('preview-image-container');

	const enlargedImg = document.createElement('img');
	enlargedImg.setAttribute('src', src);
	enlargedImg.classList.add('preview-enlarged-img');

	const infoContainer = document.createElement('div');
	infoContainer.classList.add('preview-info-container');

	// -------- Partie utilisateur --------
	const userContainer = document.createElement('div');
	userContainer.classList.add('user-container');
	const userIcon = document.createElement('div');
	userIcon.classList.add('user-icon');

	const userLogoURL = `/wp-sauvegarde/user/${userId}/user_logo.png?t=${Date.now()}`;
	const imgTest = new Image();
	imgTest.src = userLogoURL;
	imgTest.onload = () => {
		userIcon.style.backgroundImage = `url(${userLogoURL})`;
		userIcon.style.backgroundSize = 'cover';
		userIcon.style.backgroundPosition = 'center';
	};
	imgTest.onerror = () => {
		userIcon.textContent = username.charAt(0).toUpperCase();
	};

	const userLoginLink = document.createElement('a');
	userLoginLink.href = `/communaute?user=${username}`;
	userLoginLink.target = '_blank';
	userLoginLink.textContent = username;
	userLoginLink.classList.add('user-login-link');

	userContainer.appendChild(userIcon);
	userContainer.appendChild(userLoginLink);

	// -------- Partie prompt --------
	const promptContainer = document.createElement('div');
	promptContainer.classList.add('prompt-container');

	const promptTitleContainer = document.createElement('div');
	promptTitleContainer.classList.add('prompt-title-container');

	const promptTitle = document.createElement('span');
	promptTitle.textContent = 'Prompt';
	promptTitle.classList.add('prompt-title');

	const copyPromptButton = document.createElement('button');
	copyPromptButton.innerHTML = '<i class="fas fa-copy"></i> Copier';
	copyPromptButton.classList.add('copy-button');

	const copyConfirmation = document.createElement('div');
	copyConfirmation.textContent = 'Copié !';
	copyConfirmation.classList.add('copy-confirmation');
	copyConfirmation.style.display = 'none';

	copyPromptButton.addEventListener('click', (event) => {
		event.stopPropagation();
		navigator.clipboard.writeText(prompt).then(() => {
			copyConfirmation.style.display = 'block';
			setTimeout(() => copyConfirmation.style.display = 'none', 2000);
		});
	});

	const promptTextElement = document.createElement('div');
	promptTextElement.textContent = prompt;
	promptTextElement.classList.add('prompt-text');

	promptTitleContainer.appendChild(promptTitle);
	promptTitleContainer.appendChild(copyPromptButton);
	promptTitleContainer.appendChild(copyConfirmation);
	promptContainer.appendChild(promptTitleContainer);
	promptContainer.appendChild(promptTextElement);

	// -------- Zone format --------
	const formatContainer = document.createElement('div');
	formatContainer.classList.add('format-container');

	const formatTitleContainer = document.createElement('div');
	formatTitleContainer.classList.add('format-title-container');

	const formatTitle = document.createElement('span');
	formatTitle.textContent = 'Format';
	formatTitle.classList.add('format-title');

	const formatTextElement = document.createElement('div');
	formatTextElement.classList.add('format-text');

	formatTitleContainer.appendChild(formatTitle);
	formatContainer.appendChild(formatTitleContainer);
	formatContainer.appendChild(formatTextElement);


	// -------- Boutons --------
	const usePromptButton = document.createElement('button');
	usePromptButton.textContent = 'Utiliser ce prompt';
	usePromptButton.classList.add('use-button');
	usePromptButton.addEventListener('click', () => {
		window.open(`/customiize?prompt=${encodeURIComponent(prompt)}`, '_blank');
	});

	const useImageButton = document.createElement('button');
	useImageButton.textContent = 'Utiliser cette image';
	useImageButton.classList.add('use-button');
	useImageButton.disabled = true;

	const updateUseImageButtonHandler = (handler) => {
		if (useImageButton._currentHandler) {
			useImageButton.removeEventListener('click', useImageButton._currentHandler);
		}

		if (typeof handler === 'function') {
			useImageButton._currentHandler = handler;
			useImageButton.addEventListener('click', handler);
		} else {
			useImageButton._currentHandler = null;
		}
	};

	const useContainer = document.createElement('div');
	useContainer.classList.add('use-container');
	useContainer.appendChild(usePromptButton);
	useContainer.appendChild(useImageButton);

	// -------- Fermeture --------
	const closeButton = document.createElement('button');
	closeButton.classList.add('close-button');
	closeButton.innerHTML = '&times;'; // caractère × simple et universel
	closeButton.addEventListener('click', () => {
		document.body.removeChild(overlay);
	});

	// -------- Assemblage DOM --------
	imageContainer.appendChild(enlargedImg);
	infoContainer.appendChild(userContainer);
	infoContainer.appendChild(promptContainer);
	infoContainer.appendChild(formatContainer);
	infoContainer.appendChild(useContainer);

	mainContainer.appendChild(closeButton);
	mainContainer.appendChild(imageContainer);
	mainContainer.appendChild(infoContainer);
	overlay.appendChild(mainContainer);
	document.body.appendChild(overlay);

	overlay.addEventListener('click', () => {
		document.body.removeChild(overlay);
	});
	mainContainer.addEventListener('click', (e) => {
		e.stopPropagation(); // ✅ empêche la fermeture au clic à l’intérieur
	});

        const setUndefinedFormatMessage = () => {
                formatTextElement.textContent = 'Non défini';
        };

        const hydrateFormatSection = () => {
                formatTextElement.textContent = '';
                updateUseImageButtonHandler(null);
                useImageButton.disabled = true;

                if (!targetFormat) {
                        console.warn('[preview] aucun format exploitable fourni par l\'image, bouton désactivé', {
                                format: formatImage,
                                userId
                        });
                        setUndefinedFormatMessage();
                        return;
                }

                const usageDetails = getProductUsageDetailsForFormat(targetFormat);
                if (!usageDetails.success) {
                        console.warn('[preview] utilisation produit indisponible pour le format', {
                                format: targetFormat || null,
                                reason: usageDetails.reason
                        });
                        setUndefinedFormatMessage();
                        return;
                }

                console.log('[preview] affichage formats via cache', {
                        format: targetFormat || null,
                        products: usageDetails.productIds.length,
                        variants: Array.isArray(usageDetails.choices) ? usageDetails.choices.length : undefined,
                        productNames: usageDetails.productIds.map((id) => usageDetails.grouped[id]?.name)
                });

                renderFormatProductList(formatTextElement, usageDetails.grouped, usageDetails.productIds);
                useImageButton.disabled = false;

                updateUseImageButtonHandler(() => {
                        launchProductUsageFromDetails(usageDetails, {
                                src,
                                prompt,
                                format: targetFormat
                        });
                });
        };

        hydrateFormatSection();


}
function redirectToConfigurator(name, id, src, prompt, format, variantId) {
	const url = new URL("/configurateur", window.location.origin);
	url.searchParams.set("nom", name);
	url.searchParams.set("id", id);
	url.searchParams.set("variant", variantId);
	url.searchParams.set("image_url", src);
	url.searchParams.set("mockup", "1");
	window.location.href = url.toString();
}

function showProductChooserOverlay(choices, src, prompt, format, productNameOverride = null) {
        const safeChoices = Array.isArray(choices) ? choices.filter(choice => choice && choice.product_name) : [];
        if (safeChoices.length === 0) {
                return;
        }

        console.table(safeChoices.map(choice => ({
                variant_id: choice.variant_id,
                product_id: choice.product_id,
                name: choice.product_name,
                size: choice.variant_size,
                color: choice.color,
                ratio: choice.ratio_image
        })));

        const overlay = document.createElement('div');
        overlay.classList.add('product-chooser-overlay');

        const box = document.createElement('div');
        box.classList.add('product-chooser-box');

        const choiceList = document.createElement('div');
        choiceList.classList.add('product-choice-list');
        box.appendChild(choiceList);

        const productGroups = [];
        const groupIndex = new Map();

        safeChoices.forEach((choice) => {
                const productKey = typeof choice.product_id !== 'undefined'
                        ? String(choice.product_id)
                        : `unknown-${choice.variant_id || productGroups.length}`;

                if (!groupIndex.has(productKey)) {
                        groupIndex.set(productKey, productGroups.length);
                        productGroups.push({
                                productId: productKey,
                                name: null,
                                variants: [],
                                seenVariantIds: new Set()
                        });
                }

                const group = productGroups[groupIndex.get(productKey)];
                const variantId = typeof choice.variant_id !== 'undefined' ? String(choice.variant_id) : null;

                if (variantId && group.seenVariantIds.has(variantId)) {
                        return;
                }

                if (variantId) {
                        group.seenVariantIds.add(variantId);
                }

                const baseName = (productNameOverride && productGroups.length === 1)
                        ? productNameOverride
                        : choice.product_name;

                if (!baseName) {
                        return;
                }

                if (!group.name) {
                        group.name = baseName;
                }

                group.variants.push(choice);
        });

        productGroups.forEach((group) => {
                if (!group || !group.name || group.variants.length === 0) {
                        return;
                }

                const groupEl = document.createElement('section');
                groupEl.classList.add('product-choice-group');

                const headerEl = document.createElement('div');
                headerEl.classList.add('product-choice-group-header');

                const nameEl = document.createElement('span');
                nameEl.classList.add('product-choice-group-name');
                nameEl.textContent = group.name;
                headerEl.appendChild(nameEl);

                if (group.variants.length > 1) {
                        const countEl = document.createElement('span');
                        countEl.classList.add('product-choice-group-count');
                        countEl.textContent = `${group.variants.length} variantes`;
                        headerEl.appendChild(countEl);
                }

                groupEl.appendChild(headerEl);

                const variantList = document.createElement('div');
                variantList.classList.add('product-choice-variants');

                group.variants.forEach((variantChoice) => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.classList.add('product-choice-button');

                        const metaParts = [];
                        if (variantChoice.variant_size) {
                                metaParts.push(variantChoice.variant_size);
                        }
                        if (variantChoice.variant_label && variantChoice.variant_label !== variantChoice.variant_size) {
                                metaParts.push(variantChoice.variant_label);
                        }

                        const colorLabel = (variantChoice.color || '').toString().trim();

                        const accessibleParts = [];
                        if (metaParts.length) {
                                accessibleParts.push(metaParts.join(' • '));
                        }
                        if (colorLabel) {
                                accessibleParts.push(colorLabel);
                        }

                        const ariaLabel = accessibleParts.length
                                ? `${group.name} – ${accessibleParts.join(' • ')}`
                                : group.name;
                        btn.setAttribute('aria-label', ariaLabel);
                        btn.title = ariaLabel;

                        const variantNameEl = document.createElement('span');
                        variantNameEl.classList.add('product-choice-name');
                        const primaryLabel = metaParts.length
                                ? metaParts[0]
                                : (colorLabel || 'Variante disponible');
                        variantNameEl.textContent = primaryLabel;
                        btn.appendChild(variantNameEl);

                        if (metaParts.length > 1) {
                                const descriptionEl = document.createElement('span');
                                descriptionEl.classList.add('product-choice-description');
                                descriptionEl.textContent = metaParts.slice(1).join(' • ');
                                btn.appendChild(descriptionEl);
                        }

                        const shouldShowColorBadge = Boolean(colorLabel) && colorLabel !== primaryLabel;

                        if (shouldShowColorBadge) {
                                const badgeWrapper = document.createElement('div');
                                badgeWrapper.classList.add('product-choice-badges');

                                const badge = document.createElement('span');
                                badge.classList.add('product-choice-badge', 'product-choice-badge--color');
                                badge.textContent = colorLabel;
                                badgeWrapper.appendChild(badge);

                                btn.appendChild(badgeWrapper);
                        }

                        btn.addEventListener('click', () => {
                                redirectToConfigurator(group.name, variantChoice.product_id, src, prompt, format, variantChoice.variant_id);
                        });

                        variantList.appendChild(btn);
                });

                groupEl.appendChild(variantList);
                choiceList.appendChild(groupEl);
        });

        const closeBtn = document.createElement('button');
        closeBtn.textContent = "Fermer";
        closeBtn.classList.add('close-choice-button');
        closeBtn.type = 'button';
        closeBtn.addEventListener('click', () => document.body.removeChild(overlay));

        box.appendChild(closeBtn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
}

