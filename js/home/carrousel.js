var intervalID;
var indexGroup = 0; // Index pour naviguer entre les groupes d'images
var imagesByFormat = {}; // Objets pour stocker les images triées par format
var imagesPerGroup = 3; // Nombre d'images affichées simultanément, réglable

jQuery(document).ready(function() {
	fetch('/wp-json/api/v1/images/load')
		.then(response => response.json())
		.then(data => {
		if (data.success && Array.isArray(data.images)) {
			logger.log("✅ Images reçues depuis REST API :", data.images);
			prepareImagesByFormat(data.images);
			afficherImage(0);
			demarrerDefilementAuto();
		} else {
			console.warn("⚠️ Réponse inattendue :", data);
		}
	})
		.catch(error => {
		console.error("❌ Erreur lors du chargement des images :", error);
	});


	jQuery('#communityCarousel .carousel-control-next').click(function() {
		deplacer('next');
		demarrerDefilementAuto();  // Réinitialiser le défilement automatique après le mouvement manuel
	});

	jQuery('#communityCarousel .carousel-control-prev').click(function() {
		deplacer('prev');
		demarrerDefilementAuto();  // Réinitialiser le défilement automatique après le mouvement manuel
	});
});

function prepareImagesByFormat(images) {
	let formatGroups = [];
	images.forEach(image => {
		if (!imagesByFormat[image.format_image]) {
			imagesByFormat[image.format_image] = [];
		}
		imagesByFormat[image.format_image].push(image);
	});

	// Créer des groupes de la taille définie par imagesPerGroup pour chaque format
	for (let format in imagesByFormat) {
		let group = imagesByFormat[format];
		for (let i = 0; i < group.length; i += imagesPerGroup) {
			let subGroup = group.slice(i, i + imagesPerGroup);
			// N'ajouter le sous-groupe que si sa taille est égale à imagesPerGroup
			if (subGroup.length === imagesPerGroup) {
				formatGroups.push(subGroup);
			}
		}
	}

	// Mélanger les groupes créés
	formatGroups = shuffleArray(formatGroups);

	// Aplatir le tableau mélangé de groupes d'images
	let groupedImages = [];
	for (let i = 0; i < formatGroups.length; i++) {
		groupedImages.push(...formatGroups[i]);
	}

	imagesByFormat = groupedImages; // Stocker les groupes d'images mélangées
	logger.log("Images triées par format :", imagesByFormat);
}


function afficherImage(indexGroup) {
	var currentGroup = imagesByFormat.slice(indexGroup * imagesPerGroup, (indexGroup + 1) * imagesPerGroup);
	var container = jQuery(".carousel-images");
	var newImages = jQuery('<div style="display: none;"></div>'); // Créer un nouveau conteneur pour les images

	currentGroup.forEach((image, index) => {
		if (image !== null && typeof image !== 'undefined' && image.image_url !== undefined) { // Vérifier si l'image n'est pas null et si image_url est défini
			var imageElem = jQuery('<img>', {
				src: image.image_url,
				alt: image.alt || '',
				class: 'preview-enlarge',
				'data-display_name': image.display_name || '',
				'data-user-logo': image.user_logo || '',
				'data-user-id': image.user_id || '',
                                'data-format-image': image.format || '',
                                'data-prompt': (typeof image.prompt === 'object'
                                    ? (image.prompt.text || image.prompt.prompt || JSON.stringify(image.prompt))
                                    : (image.prompt || ''))
                        });

			newImages.append(imageElem); // Ajouter les nouvelles images au conteneur temporaire
		}
	});


	// Assurer que les marges et la largeur des images s'ajustent parfaitement
	var totalMarginSpace = (imagesPerGroup - 1) * 1; // Calculer l'espace total pour les marges (en %)
	var imageWidth = (100 - totalMarginSpace) / imagesPerGroup; // Calculer la largeur de chaque image

	// Appliquer les styles dynamiquement
	newImages.find('img').each(function(index) {
		jQuery(this).css({
			flex: '0 0 ' + imageWidth + '%',
			maxWidth: imageWidth + '%',
			marginRight: index === currentGroup.length - 1 ? '0' : '1%' // Appliquer la marge sauf pour la dernière image
		});
	});

	// Remplacer les anciennes images par les nouvelles de manière fluide
	container.fadeOut(300, function() {
		container.empty().append(newImages.children()).fadeIn(300, function () {
			enableImageEnlargement(); // 💡 Important : réattache les événements
		});
	});

}

function demarrerDefilementAuto() {
	clearInterval(intervalID);
	intervalID = setInterval(function() {
		deplacer('next'); // Déplace de un groupe à chaque intervalle
	}, 20000); // Intervalle de défilement automatique, réglable
}

function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function deplacer(direction) {
	let maxIndex = Math.ceil(imagesByFormat.length / imagesPerGroup) - 1;

	if (direction === 'next') {
		indexGroup += 1; // Se déplacer en avant d'un groupe
		if (indexGroup > maxIndex) {
			indexGroup = 0; // Réinitialiser l'index à 0 si la limite maximale est atteinte
		}
	} else {
		indexGroup -= 1; // Se déplacer en arrière d'un groupe
		if (indexGroup < 0) {
			indexGroup = maxIndex; // Réinitialiser l'index à la limite maximale si l'index est inférieur à 0
		}
	}

	afficherImage(indexGroup);
}
