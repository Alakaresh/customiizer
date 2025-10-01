var allImages = [];
const PLACEHOLDER_IMAGE_SRC = 'https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png';

jQuery(document).ready(function() {
        // Requête AJAX pour récupérer les images
        loadImages();

        initializeGenerationPreviewUseButton();
});

function initializeGenerationPreviewUseButton() {
        const previewImage = document.getElementById('generation-preview-image');
        const useButton = document.getElementById('generation-preview-use-button');

        if (!previewImage || !useButton) {
                return;
        }

        const updateButtonState = () => {
                const canUseImage =
                        previewImage.classList.contains('preview-enlarge') &&
                        Boolean(previewImage.getAttribute('data-format-image'));

                useButton.disabled = !canUseImage;
                useButton.classList.toggle('is-disabled', !canUseImage);

                if (!canUseImage) {
                        useButton.setAttribute('aria-disabled', 'true');
                } else {
                        useButton.removeAttribute('aria-disabled');
                }
        };

        const observer = new MutationObserver(updateButtonState);
        observer.observe(previewImage, {
                attributes: true,
                attributeFilter: ['src', 'class', 'data-format-image', 'data-prompt']
        });

        updateButtonState();

        useButton.addEventListener('click', () => {
                if (useButton.disabled) {
                        return;
                }

                const src = previewImage.getAttribute('src');
                const format = previewImage.getAttribute('data-format-image');
                const prompt = previewImage.getAttribute('data-prompt');
                const displayName = previewImage.getAttribute('data-display_name') || '';
                const userId = previewImage.getAttribute('data-user-id') || '';

                if (typeof startImageProductUsageFlow === 'function') {
                        const result = startImageProductUsageFlow({
                                src,
                                prompt,
                                format
                        });

                        if (!result || result.success !== true) {
                                if (typeof openImageOverlay === 'function') {
                                        openImageOverlay(src, userId, displayName, format, prompt);
                                }
                        }
                } else if (typeof openImageOverlay === 'function') {
                        openImageOverlay(src, userId, displayName, format, prompt);
                }
        });
}

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
