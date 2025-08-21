var allImages = [];

jQuery(document).ready(function() {
	// Requête AJAX pour récupérer les images
	loadImages();
});

function loadImages() {
	if (allImages.length === 0) {
		fetch('/wp-json/api/v1/images/load')
			.then(response => response.json())
			.then(data => {
			logger.log("[API] 🔄 Données reçues depuis l'API REST :", data); // ← ICI

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

	logger.log(`[displayImages] ${filteredImages.length} images trouvées pour le ratio : ${selectedRatio}`);

	if (filteredImages.length === 0) {
		logger.log('[displayImages] Aucune image trouvée, affichage des images d\'attente.');
		for (var i = 0; i < 4; i++) {
			var imgElement = jQuery('<img>')
			.attr('src', '/wp-content/themes/customiizer/images/customiizerSiteImages/attente.png')
			.attr('alt', 'Image d\'attente ' + i)
			.addClass(i < 2 ? 'top' : 'bottom');
			var imgContainer = jQuery('<div>').addClass('image-container ' + (i < 2 ? 'top' : 'bottom'))
			.append(imgElement);
			container.append(imgContainer);
		}
	} else {
		logger.log('[displayImages] Affichage des vraies images générées.');
		shuffleArray(filteredImages);

		filteredImages.slice(0, 4).forEach(function(image, index) {
			logger.log("[displayImages] image :", image);
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

			var imgContainer = jQuery('<div>').addClass('image-container ' + (index < 2 ? 'top' : 'bottom'))
			.append(imgElement);
			container.append(imgContainer);
		});
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
	logger.log("[CurrentUser] userId attendu :", currentUser.ID);
	logger.log("[CurrentUser] Exemple d'image :", allImages.slice(0, 5));

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
