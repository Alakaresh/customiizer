var allImages = [];
const PLACEHOLDER_IMAGE_SRC = 'https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png';
const GENERATION_PREVIEW_IMAGE_ID = 'generation-preview-image';
const GENERATION_PREVIEW_ACTION_CONTAINER_ID = 'generation-preview-action';
const GENERATION_PREVIEW_ACTION_BUTTON_ID = 'generation-preview-use-button';

function normalizeUrlForComparison(value) {
        if (typeof value !== 'string' || value.trim() === '') {
                return '';
        }

        try {
                return new URL(value, window.location.origin).href;
        } catch (error) {
                return value.trim();
        }
}

function getGenerationPreviewImageElement() {
        return document.getElementById(GENERATION_PREVIEW_IMAGE_ID);
}

function getGenerationPreviewActionContainer() {
        return document.getElementById(GENERATION_PREVIEW_ACTION_CONTAINER_ID);
}

function getGenerationPreviewActionButton() {
        return document.getElementById(GENERATION_PREVIEW_ACTION_BUTTON_ID);
}

function resolveGenerationPreviewState() {
        const imageElement = getGenerationPreviewImageElement();
        const placeholderValue = imageElement?.dataset?.placeholder || PLACEHOLDER_IMAGE_SRC;
        const currentSrc = imageElement ? imageElement.getAttribute('src') || '' : '';
        const normalizedSrc = normalizeUrlForComparison(currentSrc);
        const normalizedPlaceholder = normalizeUrlForComparison(placeholderValue);
        const hasValidImage = Boolean(normalizedSrc && (!normalizedPlaceholder || normalizedSrc !== normalizedPlaceholder));

        const variant = typeof window !== 'undefined' ? window.selectedVariant : null;
        const hasVariant = Boolean(
                variant &&
                (variant.product_id || variant.product_id === 0) &&
                (variant.variant_id || variant.variant_id === 0)
        );
        const productName = hasVariant && typeof variant.product_name === 'string'
                ? variant.product_name.trim()
                : '';

        return {
                hasValidImage,
                imageSrc: hasValidImage ? currentSrc : '',
                format: imageElement?.dataset?.formatImage || '',
                prompt: imageElement?.dataset?.prompt || '',
                variant,
                hasVariant,
                productName
        };
}

function updateGenerationPreviewAction() {
        const container = getGenerationPreviewActionContainer();
        const button = getGenerationPreviewActionButton();

        if (!container || !button) {
                return;
        }

        const state = resolveGenerationPreviewState();
        const isEnabled = state.hasValidImage && state.hasVariant;

        container.dataset.enabled = isEnabled ? 'true' : 'false';
        container.setAttribute('aria-hidden', isEnabled ? 'false' : 'true');

        button.disabled = !isEnabled;
        button.setAttribute('aria-disabled', isEnabled ? 'false' : 'true');

        const baseLabel = state.productName
                ? `Utiliser sur ${state.productName}`
                : 'Utiliser sur le produit';

        button.textContent = baseLabel;
        button.setAttribute(
                'aria-label',
                state.productName
                        ? `Utiliser cette image sur ${state.productName}`
                        : 'Utiliser cette image sur le produit sélectionné'
        );
        button.setAttribute('title', baseLabel);
}

function handleGenerationPreviewActionClick(event) {
        event.preventDefault();

        const button = event.currentTarget;
        if (!button || button.disabled) {
                return;
        }

        const state = resolveGenerationPreviewState();
        if (!state.hasValidImage || !state.hasVariant || !state.variant) {
                return;
        }

        const productId = state.variant.product_id;
        const variantId = state.variant.variant_id;

        if (productId == null || variantId == null) {
                return;
        }

        const productName = state.productName || '';
        const format = state.format || '';
        const prompt = state.prompt || '';
        const imageSrc = state.imageSrc;

        if (!imageSrc) {
                return;
        }

        if (typeof redirectToConfigurator === 'function') {
                redirectToConfigurator(productName, productId, imageSrc, prompt, format, variantId);
                return;
        }

        const fallbackUrl = new URL('/configurateur', window.location.origin);
        if (productName) {
                fallbackUrl.searchParams.set('nom', productName);
        }
        fallbackUrl.searchParams.set('id', String(productId));
        fallbackUrl.searchParams.set('variant', String(variantId));
        fallbackUrl.searchParams.set('image_url', imageSrc);
        fallbackUrl.searchParams.set('mockup', '1');
        if (prompt) {
                fallbackUrl.searchParams.set('prompt', prompt);
        }

        window.location.href = fallbackUrl.toString();
}

window.updateGenerationPreviewAction = updateGenerationPreviewAction;

document.addEventListener('DOMContentLoaded', function() {
        const actionButton = getGenerationPreviewActionButton();
        if (actionButton) {
                actionButton.addEventListener('click', handleGenerationPreviewActionClick);
        }

        const previewImage = getGenerationPreviewImageElement();
        if (previewImage) {
                previewImage.addEventListener('load', function() {
                        if (typeof window.updateGenerationPreviewAction === 'function') {
                                window.updateGenerationPreviewAction();
                        }
                });
        }

        updateGenerationPreviewAction();
});

jQuery(document).ready(function() {
        // Requête AJAX pour récupérer les images
        loadImages();
});

function loadImages() {
	if (allImages.length === 0) {
		fetch('/wp-json/api/v1/images/load')
			.then(response => response.json())
			.then(data => { // ← ICI

			if (data.success && data.images) {
				allImages = data.images;
				displayImages();
				displayImagesForCurrentUser();
				enableImageEnlargement();
			} else {
				console.warn("❌ Aucune image retournée ou format inattendu :", data);
			}
		})
			.catch(error => {
			console.error('❌ Erreur lors de la récupération des images :', error);
		});
	} else {
		displayImages();
		displayImagesForCurrentUser();
		enableImageEnlargement();
	}
}

function displayImages() {
        var gridContainer = jQuery('#content-images .image-grid');
        var singlePreview = jQuery('#generation-preview-image');

        var filteredImages = allImages.filter(function(image) {
                return image.format === selectedRatio; // Filtrer les images selon le ratio global
        });

        if (gridContainer.length) {
                gridContainer.empty(); // Nettoyer la grille avant d'ajouter de nouvelles images

                if (filteredImages.length === 0) {
                        for (var i = 0; i < 4; i++) {
                                var imgElement = jQuery('<img>')
                                        .attr('src', PLACEHOLDER_IMAGE_SRC)
                                        .attr('alt', "Image d'attente " + i)
                                        .addClass(i < 2 ? 'top' : 'bottom');

                                var imgContainer = jQuery('<div>')
                                        .addClass('image-container ' + (i < 2 ? 'top' : 'bottom'))
                                        .append(imgElement);

                                gridContainer.append(imgContainer);
                        }
                } else {
                        shuffleArray(filteredImages);

                        filteredImages.slice(0, 4).forEach(function(image, index) {
                                const promptText = typeof image.prompt === 'object'
                                        ? (image.prompt.text || image.prompt.prompt || JSON.stringify(image.prompt))
                                        : (image.prompt || '');

                                var imgElement = jQuery('<img>')
                                        .attr('src', image.image_url)
                                        .attr('alt', 'Image ' + image.image_number)
                                        .attr('data-display_name', image.display_name || '')
                                        .attr('data-user-logo', image.user_logo || '')
                                        .attr('data-user-id', image.user_id || '')
                                        .attr('data-format-image', image.format || '')
                                        .attr('data-prompt', promptText)
                                        .addClass('preview-enlarge')
                                        .addClass(index < 2 ? 'top' : 'bottom');

                                var imgContainer = jQuery('<div>')
                                        .addClass('image-container ' + (index < 2 ? 'top' : 'bottom'))
                                        .append(imgElement);

                                gridContainer.append(imgContainer);
                        });
                }
        } else if (singlePreview.length) {
                var targetImage = singlePreview.first();

                if (filteredImages.length === 0) {
                        targetImage
                                .attr('src', PLACEHOLDER_IMAGE_SRC)
                                .attr('alt', "Image d'attente")
                                .removeClass('preview-enlarge')
                                .removeAttr('data-display_name')
                                .removeAttr('data-user-logo')
                                .removeAttr('data-user-id')
                                .removeAttr('data-format-image')
                                .removeAttr('data-prompt');
                } else {
                        const image = filteredImages[0];
                        const promptText = typeof image.prompt === 'object'
                                ? (image.prompt.text || image.prompt.prompt || JSON.stringify(image.prompt))
                                : (image.prompt || '');

                        targetImage
                                .attr('src', image.image_url)
                                .attr('alt', 'Image ' + image.image_number)
                                .attr('data-display_name', image.display_name || '')
                                .attr('data-user-logo', image.user_logo || '')
                                .attr('data-user-id', image.user_id || '')
                                .attr('data-format-image', image.format || '')
                                .attr('data-prompt', promptText)
                                .addClass('preview-enlarge');
                }
        }

        if (typeof adjustImageHeight === 'function') {
                adjustImageHeight();
        }

        if (typeof window.updateGenerationPreviewAction === 'function') {
                window.updateGenerationPreviewAction();
        }
}



function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]]; // Échange les éléments
	}
}

function displayImagesForCurrentUser() {
	var mainContent = jQuery('#user_images');
	mainContent.empty(); // Nettoyer le contenu précédent
	var currentUserImages = allImages.filter(function(image) {
		return image.user_id == currentUser.ID; // ✅ correction ici
	});


	if (currentUserImages.length === 0) {
		mainContent.append('<p>Générez vos premières images maintenant !</p>');
		jQuery('#generate_first_images_button').click(function() {
			alert("Redirection vers la page de génération d'images");
		});
	} else {
		// Ajouter les images directement à mainContent
                currentUserImages.forEach(function(image) {
                        const promptText = typeof image.prompt === 'object'
                            ? (image.prompt.text || image.prompt.prompt || JSON.stringify(image.prompt))
                            : (image.prompt || '');

                        var imgElement = jQuery('<img>')
                        .attr('src', image.image_url)
                        .attr('alt', 'Image ' + image.image_number)
                        .attr('data-display_name', image.display_name || '')
                        .attr('data-user-logo', image.user_logo || '')
                        .attr('data-user-id', image.user_id || '')
                        .attr('data-format-image', image.format || '')
                        .attr('data-prompt', promptText)
                        .addClass('preview-enlarge');

			mainContent.append(imgElement);
		});
	}
}
