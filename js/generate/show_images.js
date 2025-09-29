var allImages = [];
const PLACEHOLDER_IMAGE_SRC = 'https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png';
const GENERATION_THUMBNAIL_LIMIT = 3;

function normalizePromptValue(prompt) {
        if (!prompt) {
                return '';
        }

        if (typeof prompt === 'string') {
                return prompt;
        }

        if (typeof prompt === 'object') {
                if (typeof prompt.text === 'string' && prompt.text.trim() !== '') {
                        return prompt.text;
                }

                if (typeof prompt.prompt === 'string' && prompt.prompt.trim() !== '') {
                        return prompt.prompt;
                }

                try {
                        return JSON.stringify(prompt);
                } catch (e) {
                        return '';
                }
        }

        return '';
}

function buildGalleryImageData(image, fallbackIndex) {
        if (!image) {
                return null;
        }

        const rawUrl = image.image_url || image.url || '';
        const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';

        if (!url) {
                return null;
        }

        const promptText = normalizePromptValue(image.prompt);
        const altText = promptText || (image.image_number ? `Image ${image.image_number}` : `Image ${fallbackIndex + 1}`);

        return {
                url,
                alt: altText,
                prompt: promptText,
                displayName: image.display_name || '',
                userLogo: image.user_logo || '',
                userId: image.user_id || '',
                format: image.format || '',
                jobId: image.job_id || image.jobId || '',
                taskId: image.task_id || image.taskId || '',
        };
}

function applyOptionalAttribute($element, attribute, value) {
        if (!$element || !$element.length) {
                return;
        }

        if (typeof value === 'string' && value.length > 0) {
                $element.attr(attribute, value);
        } else {
                $element.removeAttr(attribute);
        }
}

function setPreviewImageFromData($imageElement, imageData) {
        if (!$imageElement || !$imageElement.length) {
                return;
        }

        if (!imageData || !imageData.url) {
                $imageElement
                        .attr('src', PLACEHOLDER_IMAGE_SRC)
                        .attr('alt', "Image d'attente")
                        .removeClass('preview-enlarge');

                ['data-format-image', 'data-prompt', 'data-display_name', 'data-user-logo', 'data-user-id', 'data-job-id', 'data-task-id'].forEach(
                        attribute => {
                                $imageElement.removeAttr(attribute);
                        }
                );

                return;
        }

        $imageElement
                .attr('src', imageData.url)
                .attr('alt', imageData.alt || 'Image générée')
                .addClass('preview-enlarge');

        applyOptionalAttribute($imageElement, 'data-format-image', imageData.format || '');
        applyOptionalAttribute($imageElement, 'data-prompt', imageData.prompt || '');
        applyOptionalAttribute($imageElement, 'data-display_name', imageData.displayName || '');
        applyOptionalAttribute($imageElement, 'data-user-logo', imageData.userLogo || '');
        applyOptionalAttribute($imageElement, 'data-user-id', imageData.userId || '');
        applyOptionalAttribute($imageElement, 'data-job-id', imageData.jobId || '');
        applyOptionalAttribute($imageElement, 'data-task-id', imageData.taskId || '');
}

function createPlaceholderThumbnail(index) {
        const button = jQuery('<button>', {
                type: 'button',
                class: 'image-container generation-thumbnail is-placeholder',
                'data-thumbnail-index': index,
                'aria-label': `Miniature ${index + 1}`,
        });

        const image = jQuery('<img>', {
                src: PLACEHOLDER_IMAGE_SRC,
                alt: "Image d'attente",
        });

        button.append(image);
        return button;
}

function createThumbnailFromData(imageData, index) {
        const button = jQuery('<button>', {
                type: 'button',
                class: 'image-container generation-thumbnail',
                'data-thumbnail-index': index,
                'aria-label': imageData.alt || `Miniature ${index + 1}`,
        });

        const image = jQuery('<img>', {
                src: imageData.url,
                alt: imageData.alt || 'Image générée',
        });

        button.data('imageData', imageData);
        button.append(image);

        return button;
}

function renderGenerationGallery(images) {
        const previewImage = jQuery('#generation-preview-image');
        const thumbnailsContainer = jQuery('#content-images .generation-thumbnails');

        if (!previewImage.length || !thumbnailsContainer.length) {
                return false;
        }

        const normalizedImages = Array.isArray(images)
                ? images
                                .map((image, index) => buildGalleryImageData(image, index))
                                .filter(Boolean)
                : [];

        thumbnailsContainer.empty();

        if (normalizedImages.length === 0) {
                setPreviewImageFromData(previewImage, null);

                for (let i = 0; i < GENERATION_THUMBNAIL_LIMIT; i++) {
                        thumbnailsContainer.append(createPlaceholderThumbnail(i));
                }

                return true;
        }

        const primaryImage = normalizedImages[0];
        setPreviewImageFromData(previewImage, primaryImage);

        const remainingImages = normalizedImages.slice(1, GENERATION_THUMBNAIL_LIMIT + 1);

        remainingImages.forEach((imageData, idx) => {
                thumbnailsContainer.append(createThumbnailFromData(imageData, idx));
        });

        for (let i = remainingImages.length; i < GENERATION_THUMBNAIL_LIMIT; i++) {
                thumbnailsContainer.append(createPlaceholderThumbnail(i));
        }

        if (typeof adjustImageHeight === 'function') {
                adjustImageHeight();
        }

        if (typeof enableImageEnlargement === 'function') {
                enableImageEnlargement();
        }

        return true;
}

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
        const thumbnailsContainer = jQuery('#content-images .generation-thumbnails');
        const filteredImages = allImages.filter(function(image) {
                return image.format === selectedRatio;
        });

        if (thumbnailsContainer.length) {
                const imagesToRender = filteredImages.length > 0 ? filteredImages.slice() : [];

                if (imagesToRender.length > 1) {
                        shuffleArray(imagesToRender);
                }

                renderGenerationGallery(imagesToRender.slice(0, 4));
                return;
        }

        var gridContainer = jQuery('#content-images .image-grid');
        var singlePreview = jQuery('#generation-preview-image');

        if (gridContainer.length) {
                gridContainer.empty();

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
                                const promptText = normalizePromptValue(image.prompt);

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
                        const promptText = normalizePromptValue(image.prompt);

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
}



function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]]; // Échange les éléments
        }
}

jQuery(document).on('click', '.generation-thumbnail', function(event) {
        const button = jQuery(this);

        if (button.hasClass('is-placeholder')) {
                return;
        }

        const imageData = button.data('imageData');
        if (!imageData || !imageData.url) {
                return;
        }

        event.preventDefault();
        event.stopPropagation();

        const previewImage = jQuery('#generation-preview-image');
        if (!previewImage.length) {
                return;
        }

        setPreviewImageFromData(previewImage, imageData);

        button.addClass('is-active').siblings('.generation-thumbnail').removeClass('is-active');

        if (typeof adjustImageHeight === 'function') {
                adjustImageHeight();
        }

        if (typeof enableImageEnlargement === 'function') {
                enableImageEnlargement();
        }
});

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
