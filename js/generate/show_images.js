var allImages = [];
var currentUserImages = [];
var currentUserPage = 1;
var USER_IMAGES_PER_PAGE = 9;

jQuery(document).ready(function() {
        // Requête AJAX pour récupérer les images
        setupUserImagesPagination();
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
	var container = jQuery('#content-images .image-grid');
	container.empty(); // Nettoyer la grille avant d'ajouter de nouvelles images

	var filteredImages = allImages.filter(function(image) {
		return image.format === selectedRatio; // Filtrer les images selon le ratio global
	});

	if (filteredImages.length === 0) {
		for (var i = 0; i < 4; i++) {
			var imgElement = jQuery('<img>')
				.attr('src', '/wp-content/themes/customiizer/images/customiizerSiteImages/attente.png')
				.attr('alt', 'Image d\'attente ' + i)
				.addClass(i < 2 ? 'top' : 'bottom');

			var imgContainer = jQuery('<div>')
				.addClass('image-container ' + (i < 2 ? 'top' : 'bottom'))
				.append(imgElement);

			container.append(imgContainer);
		}
		return;
	}

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

		container.append(imgContainer);
	});
}


function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]]; // Échange les éléments
	}
}

function displayImagesForCurrentUser() {
        currentUserImages = allImages.filter(function(image) {
                return image.user_id == currentUser.ID;
        });

        currentUserPage = 1;
        renderCurrentUserImages();
}

function renderCurrentUserImages() {
        var mainContent = jQuery('#user_images');
        mainContent.empty();

        if (!Array.isArray(currentUserImages) || currentUserImages.length === 0) {
                mainContent.append('<p>Générez vos premières images maintenant !</p>');
                currentUserPage = 1;
                updateUserImagesPagination();
                return;
        }

        var totalPages = Math.ceil(currentUserImages.length / USER_IMAGES_PER_PAGE);
        if (totalPages === 0) {
                updateUserImagesPagination();
                return;
        }

        if (currentUserPage > totalPages) {
                currentUserPage = totalPages;
        }
        if (currentUserPage < 1) {
                currentUserPage = 1;
        }

        var startIndex = (currentUserPage - 1) * USER_IMAGES_PER_PAGE;
        var paginatedImages = currentUserImages.slice(startIndex, startIndex + USER_IMAGES_PER_PAGE);

        paginatedImages.forEach(function(image) {
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

        updateUserImagesPagination();
        enableImageEnlargement();
}

function updateUserImagesPagination() {
        var paginationContainer = jQuery('#user_images_pagination');
        var pageInfo = jQuery('#user_images_page_info');
        var prevButton = jQuery('#user_images_prev');
        var nextButton = jQuery('#user_images_next');

        if (!paginationContainer.length || !pageInfo.length || !prevButton.length || !nextButton.length) {
                return;
        }

        var totalImages = Array.isArray(currentUserImages) ? currentUserImages.length : 0;
        var totalPages = totalImages > 0 ? Math.ceil(totalImages / USER_IMAGES_PER_PAGE) : 0;

        if (totalImages === 0 || totalPages <= 1) {
                paginationContainer.addClass('hidden');
                paginationContainer.attr('aria-hidden', 'true');
                pageInfo.text('');
                prevButton.prop('disabled', true);
                nextButton.prop('disabled', true);
                return;
        }

        paginationContainer.removeClass('hidden');
        paginationContainer.attr('aria-hidden', 'false');
        pageInfo.text(currentUserPage + ' / ' + totalPages);
        prevButton.prop('disabled', currentUserPage === 1);
        nextButton.prop('disabled', currentUserPage === totalPages);
}

function setupUserImagesPagination() {
        var prevButton = jQuery('#user_images_prev');
        var nextButton = jQuery('#user_images_next');

        if (!prevButton.length || !nextButton.length) {
                return;
        }

        prevButton.on('click', function() {
                if (currentUserPage > 1) {
                        currentUserPage -= 1;
                        renderCurrentUserImages();
                }
        });

        nextButton.on('click', function() {
                var totalPages = Array.isArray(currentUserImages) && currentUserImages.length > 0
                        ? Math.ceil(currentUserImages.length / USER_IMAGES_PER_PAGE)
                        : 0;

                if (totalPages > 0 && currentUserPage < totalPages) {
                        currentUserPage += 1;
                        renderCurrentUserImages();
                }
        });
}
