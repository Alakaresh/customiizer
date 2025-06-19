var ImageLoader = (function() {
	const IMAGES_PER_BATCH = 16;
	let currentPage = 1;
	let allImages = []; // Il manquait la déclaration dans ton script

	function loadUserGeneratedImages() {

		// Vérifier si on a déjà en session
		const storedImages = sessionStorage.getItem('userGeneratedImages');

		if (storedImages) {
			allImages = JSON.parse(storedImages);
			renderImages();
			enableImageEnlargement();
			return;
		}

		// Sinon, on fetch normalement
		const apiUrl = `/wp-json/api/v1/images/load/${currentUser.ID}?limit=1000`;

		fetch(apiUrl)
			.then(response => response.json())
			.then(data => {
			if (data.success && Array.isArray(data.images)) {
				allImages = data.images;

				// Stocker dans sessionStorage
				sessionStorage.setItem('userGeneratedImages', JSON.stringify(allImages));

				renderImages();
				enableImageEnlargement();
			} else {
				console.error('Invalid response format or no images found:', data);
				jQuery('#image-container').html('<p>Aucune image trouvée.</p>');
			}
		})
			.catch(error => {
			console.error('❌ Erreur AJAX:', error);
			jQuery('#image-container').html('<p>Erreur lors de la récupération des images.</p>');
		});
	}


	function renderImages() {
		var startIndex = (currentPage - 1) * IMAGES_PER_BATCH;
		var endIndex = startIndex + IMAGES_PER_BATCH;
		var imagesToRender = allImages.slice(startIndex, endIndex);

		var container = jQuery('<div/>', { class: 'image-container' }).css({
			'display': 'flex',
			'justify-content': 'space-between'
		});

		var columns = [];
		for (var i = 0; i < 4; i++) {
			columns[i] = jQuery('<div/>', { class: 'imageColumn' }).css({
				'width': '23%',
				'display': 'flex',
				'flex-direction': 'column',
				'gap': '10px'
			});
			container.append(columns[i]);
		}

		imagesToRender.forEach(function(image, index) {
			var imageDiv = jQuery('<div/>', { class: 'imageContainer' });

			var img = jQuery('<img/>', {
				src: image.image_url,
				alt: 'Generated Image',
				class: 'preview-enlarge',
				css: { 'border-radius': '10px', 'width': '100%' },
				'data-display_name': image.display_name || '',
				'data-user-logo': image.user_logo || '',
				'data-user-id': image.user_id || '',
                                'data-format-image': image.format || '',
                                'data-prompt': (typeof image.prompt === 'object'
                                    ? (image.prompt.text || image.prompt.prompt || JSON.stringify(image.prompt))
                                    : (image.prompt || ''))
                        });

			imageDiv.append(img);
			columns[index % 4].append(imageDiv);
		});

		jQuery('#image-container').html(container);
		checkPagination();
	}

	function checkPagination() {
		var pagination = jQuery('<div/>', { class: 'pagination', css: { 'text-align': 'center', 'margin-top': '20px' } });

		var totalPages = Math.ceil(allImages.length / IMAGES_PER_BATCH);

		if (currentPage > 1) {
			pagination.append(jQuery('<button/>', {
				text: 'Précédent',
				click: function() {
					currentPage--;
					renderImages();
				}
			}));
		}

		pagination.append(jQuery('<span/>', {
			text: 'Page ' + currentPage + ' sur ' + totalPages,
			css: { 'margin': '0 10px' }
		}));

		if (currentPage * IMAGES_PER_BATCH < allImages.length) {
			pagination.append(jQuery('<button/>', {
				text: 'Suivant',
				click: function() {
					currentPage++;
					renderImages();
				}
			}));
		}

		jQuery('#image-container').append(pagination);
	}

	return {
		loadUserGeneratedImages: loadUserGeneratedImages
	};
})();

jQuery(document).ready(function($) {
	ImageLoader.loadUserGeneratedImages();
});
