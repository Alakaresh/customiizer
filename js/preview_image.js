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

function renderFormatProductList(container, grouped, productIds, defaultFormatLabel) {
        if (!container) {
                return;
        }

        container.innerHTML = '';

        if (defaultFormatLabel) {
                const ratioLabel = document.createElement('div');
                ratioLabel.classList.add('format-ratio-label');
                ratioLabel.textContent = defaultFormatLabel;
                container.appendChild(ratioLabel);
        }

        if (!Array.isArray(productIds) || productIds.length === 0) {
                return;
        }

        const productList = document.createElement('div');
        productList.classList.add('format-product-list');

        productIds.forEach((productId) => {
                const product = grouped[productId];
                if (!product) {
                        return;
                }

                const productBlock = document.createElement('div');
                productBlock.classList.add('format-product-item');

                const productNameEl = document.createElement('div');
                productNameEl.classList.add('format-product-name');
                productNameEl.textContent = product.name || defaultFormatLabel || 'Produit disponible';
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
        const defaultFormatLabel = targetFormat || 'Format non communiqué';
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

        const processData = (data) => {
                console.log('[preview] processing cached product data', {
                        format: targetFormat || null,
                        success: data ? data.success : undefined,
                        choices: data && Array.isArray(data.choices) ? data.choices.length : undefined
                });
                if (!data || !data.success || !Array.isArray(data.choices) || data.choices.length === 0) {
                        formatTextElement.textContent = "Aucun produit trouvé.";
                        useImageButton.disabled = true;
                        return;
                }

                const grouped = {};
                data.choices.forEach(choice => {
                        if (!grouped[choice.product_id]) {
                                grouped[choice.product_id] = {
                                        name: choice.product_name,
                                        variants: []
                                };
                        }
                        grouped[choice.product_id].variants.push(choice);
                });

                const productIds = Object.keys(grouped);
                console.log('[preview] affichage ratio via cache', {
                        format: targetFormat || null,
                        products: productIds.length,
                        variants: data.choices.length,
                        productNames: productIds.map((id) => grouped[id].name).filter(Boolean)
                });

                renderFormatProductList(formatTextElement, grouped, productIds, defaultFormatLabel);

                useImageButton.disabled = false;

                if (productIds.length === 1) {
                        const { name, variants } = grouped[productIds[0]];
                        useImageButton.addEventListener('click', () => {
                                if (variants.length === 1) {
                                        const v = variants[0];
                                        redirectToConfigurator(name, v.product_id, src, prompt, targetFormat, v.variant_id);
                                } else {
                                        showProductChooserOverlay(variants, src, prompt, targetFormat, name);
                                }
                        }, { once: true });
                } else {
                        useImageButton.addEventListener('click', () => {
                                const allVariants = Object.values(grouped).flatMap(p => p.variants);
                                showProductChooserOverlay(allVariants, src, prompt, targetFormat);
                        }, { once: true });
                }
        };

        const loadProductInfo = () => {
                const cache = window.formatProductsCache;

                const handleError = (err) => {
                        console.error("❌ Erreur chargement produits compatibles :", err);
                        useImageButton.disabled = true;
                };

                if (!cache) {
                        console.warn('[preview] formatProductsCache indisponible, impossible de charger', { format: targetFormat || null });
                        return;
                }

                if (!targetFormat) {
                        console.warn('[preview] format image absent ou invalide, chargement abandonné', { userId });
                        useImageButton.disabled = true;
                        return;
                }

                const cached = cache.get(targetFormat);
                if (typeof cached === 'undefined') {
                        const availableFormats = cache.getCache ? Object.keys(cache.getCache()) : [];
                        console.warn('[preview] format absent du cache – aucune requête API lancée', {
                                format: targetFormat,
                                knownInDb: dbRatios.has(targetFormat),
                                availableFormats
                        });
                        useImageButton.disabled = true;
                        formatTextElement.textContent = defaultFormatLabel;
                        return;
                }

                try {
                        processData(cached);
                } catch (error) {
                        handleError(error);
                }
        };

        formatTextElement.textContent = defaultFormatLabel;
        useImageButton.disabled = true;

        if (!targetFormat) {
                console.warn('[preview] aucun format exploitable fourni par l\'image, bouton désactivé', {
                        format: formatImage,
                        userId
                });
                return;
        }

        loadProductInfo();


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
	console.table(choices.map(choice => ({
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

	const title = document.createElement('h3');
	title.textContent = "Choisissez une variante";
	box.appendChild(title);

	choices.forEach(choice => {
		const btn = document.createElement('button');
		btn.classList.add('product-choice-button');

		const displayName = productNameOverride || choice.product_name;
                const sizeLabel = choice.variant_size || "?";
                const label = `${displayName} – ${sizeLabel}`;
		btn.textContent = label;

		btn.addEventListener('click', () => {
			redirectToConfigurator(displayName, choice.product_id, src, prompt, format, choice.variant_id);
		});

		box.appendChild(btn);
	});

	const closeBtn = document.createElement('button');
	closeBtn.textContent = "Fermer";
	closeBtn.classList.add('close-choice-button');
	closeBtn.addEventListener('click', () => document.body.removeChild(overlay));

	box.appendChild(closeBtn);
	overlay.appendChild(box);
	document.body.appendChild(overlay);
}

