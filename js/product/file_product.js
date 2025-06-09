jQuery(document).ready(function () {
	const customizeModal = jQuery('#customizeModal'); // Modal principal
	const imageSourceModal = jQuery('#imageSourceModal'); // Modal secondaire
	const closeButton = jQuery('.close-button'); // Boutons de fermeture
	const customizeButton = jQuery('.design-button'); // Bouton pour ouvrir le modal principal
	const siteFilesList = jQuery('#siteFilesList'); // Liste des fichiers sur le site
	const pcFilesList = jQuery('#pcFilesList'); // Liste des fichiers importés depuis le PC
	const addImageButton = jQuery('#addImageButton'); // Bouton "Ajouter une image"
	const uploadPcImageButton = jQuery('#uploadPcImageButton'); // Bouton "Importer depuis le PC"
	let isImagesLoaded = false; // État de chargement des images
	let importedFiles = []; // Liste des fichiers importés depuis le PC
	let filterByRatio = false;


	// Fermer les modals
	closeButton.on('click', function () {
		jQuery(this).closest('.modal').hide();
	});

	// Fermer en cliquant à l'extérieur du modal principal
	jQuery(window).on('click', function (event) {
		if (jQuery(event.target).is(customizeModal)) {
			customizeModal.hide();
		}
	});

	// Gestion du clic sur les boutons "Mes images" et "Images de la communauté"
	jQuery('#userImagesButton').on('click', function () {
		setActiveButton(this);
		displayGeneratedImages(allGeneratedImages, "user");
	});

	jQuery('#communityImagesButton').on('click', function () {
		setActiveButton(this);
		displayGeneratedImages(allGeneratedImages, "community");
	});

	// Fonction pour activer le bouton cliqué et désactiver l'autre
	function setActiveButton(activeButton) {
		jQuery('.toggle-button').removeClass('active');
		jQuery(activeButton).addClass('active');
	}

	// Ouvrir le modal secondaire depuis le bouton "Ajouter une image"
	addImageButton.on('click', function () {
		console.log("ratioImage", selectedImageRatio)
		imageSourceModal.show();
		if (!isImagesLoaded) {
			if (typeof allGeneratedImages !== 'undefined' && Array.isArray(allGeneratedImages)) {
				displayGeneratedImages(allGeneratedImages, "user"); // Par défaut, afficher les images utilisateur
				loadSavedImages();
				isImagesLoaded = true; // Marquer les images comme chargées
			} else {
				console.error("Erreur : Les images générées ne sont pas disponibles.");
				siteFilesList.append('<div>Erreur : Les images générées ne sont pas disponibles.</div>');
			}
		}
	});

	jQuery('#toggleProductImagesButton').on('click', function () {
		filterByRatio = !filterByRatio; // Basculer l'état
		const buttonText = filterByRatio
		? "Afficher toutes les images"
		: "Afficher les images du produit actif";
		jQuery(this).text(buttonText); // Mettre à jour le texte du bouton

		// Afficher les images filtrées ou toutes les images
		if (filterByRatio) {
			console.log("Application du filtre par ratio :", selectedImageRatio);
			displayGeneratedImages(allGeneratedImages, "user", selectedImageRatio);
		} else {
			console.log("Affichage de toutes les images");
			displayGeneratedImages(allGeneratedImages, "user");
		}
	});

	// Fonction pour afficher les images générées
	function displayGeneratedImages(images, mode = "user", ratio = null) {
		console.log("Appel de displayGeneratedImages"); // Log initial
		console.log("Mode :", mode, "Ratio :", ratio); // Vérifiez les paramètres

		siteFilesList.empty(); // Vider la liste avant d'ajouter les images

		// Séparer les images utilisateur et communauté
		const userImages = images.filter(image => image.customer_id === String(userId));
		const communityImages = images.filter(image => image.customer_id !== String(userId));

		// Sélectionner les images selon le mode
		let imagesToDisplay = mode === "user" ? userImages : communityImages;

		// Appliquer le filtre par ratio si nécessaire
		if (ratio) {
			imagesToDisplay = imagesToDisplay.filter(image => image.format_image === ratio);
		}

		console.log("Images à afficher :", imagesToDisplay); // Vérifiez les images filtrées

		if (imagesToDisplay.length > 0) {
			let imagesLoaded = 0; // Compteur pour vérifier quand toutes les images sont chargées
			const totalImages = imagesToDisplay.length;

			imagesToDisplay.forEach((image, index) => {
				const img = $('<img/>', {
					src: image.image_url,
					alt: 'Generated Image',
					class: 'image-thumbnail preview-enlarged',
					'data-image-url': image.image_url
				});

				const imageDiv = $(`
                <div class="site-image">
                    <div class="image-details">
                        <span>Date : ${image.image_date}</span>
                        <span>Prompt : ${image.prompt}</span>
                        <button class="select-image-button" data-image-url="${image.image_url}">Sélectionner</button>
                    </div>
                </div>
            `).prepend(img);

				siteFilesList.append(imageDiv);

				// Événement chargé sur chaque image
				img.on('load', () => {
					imagesLoaded++;
					console.log(`Image ${index + 1}/${totalImages} chargée.`);

					// Vérifier si toutes les images sont chargées
					if (imagesLoaded === totalImages) {
						console.log("Toutes les images sont chargées.");
						enableImageEnlargement(); // Appeler après le chargement complet
					}
				});

				// Gestion des erreurs de chargement d'images
				img.on('error', () => {
					console.error(`Erreur de chargement de l'image : ${image.image_url}`);
				});
			});
		} else {
			siteFilesList.append(`<div>Aucune image trouvée pour le ratio sélectionné (${ratio}) ou mode (${mode}).</div>`);
		}
	}


	// Gestion du clic sur le bouton "Importer depuis le PC"
	uploadPcImageButton.on('click', function () {
		const input = jQuery('<input type="file" accept="image/*">'); // Accepter uniquement les images
		input.on('change', function (event) {
			const file = event.target.files[0];
			if (file) {
				// Convertir le fichier en base64 pour l'envoyer via AJAX
				const reader = new FileReader();
				reader.onload = function (e) {
					const fileData = {
						name: file.name,
						size: file.size,
						url: e.target.result // URL encodée en base64
					};

					// Envoyer le fichier au serveur via AJAX
					uploadFileToServer(fileData);
				};
				reader.readAsDataURL(file); // Lire le fichier
			}
		});
		input.click(); // Ouvrir le sélecteur de fichiers
	});

	function uploadFileToServer(fileData) {
		jQuery.ajax({
			url: ajaxurl, // URL pour la requête AJAX
			type: 'POST',
			dataType: 'json', // Attendre une réponse JSON
			data: {
				action: 'save_imported_image_from_url', // Action WordPress
				url: fileData.url,
				name: fileData.name,
				size: fileData.size
			},

			success: function (response) {
				const importedFilesSection = jQuery('.imported-files');
				if (response.success) {
					importedFiles.push({
						name: fileData.name,
						size: fileData.size,
						url: response.data.blob_path // URL renvoyée par le serveur
					});
					displayImportedFiles(); // Mettre à jour l'affichage

					importedFilesSection.show();
				} else {
					alert('Erreur : ' + response.message);
					console.error('Erreur du serveur :', response.message || 'Une erreur est survenue.');
				}
			},
			error: function (xhr, status, error) {
				console.error('Erreur lors de l\'envoi du fichier :', error);
			}
		});
	}

	// Fonction pour afficher les fichiers importés
	function displayImportedFiles() {
		pcFilesList.empty(); // Vider la liste avant de ré-afficher
		if (importedFiles.length === 0) {
			pcFilesList.append('<div>Aucun fichier importé.</div>');
			return;
		}

		importedFiles.forEach((file, index) => {
			pcFilesList.append(`
            <div class="site-image">
                <img src="${file.url}" alt="${file.name}" class="image-thumbnail" data-image-url="${file.url}">
                <div class="file-details">
                    <span><strong>${file.name}</strong></span>
                    <span>(${(file.size / 1024).toFixed(2)} KB)</span>
                    <button class="delete-button" data-index="${index}">&times;</button>
                </div>
            </div>
        `);
		});
	}


	function loadSavedImages() {
		jQuery.ajax({
			url: ajaxurl, // URL de l'action AJAX WordPress
			type: 'POST',
			dataType: 'json',
			data: {
				action: 'get_saved_images' // Action définie dans WordPress
			},
			success: function (response) {
				const importedFilesSection = jQuery('.imported-files'); // Cible la section des fichiers importés
				if (response.success && response.data.length > 0) {
					importedFiles = response.data.map(image => ({
						name: image.image_url.split('/').pop(), // Récupérer le nom du fichier à partir de l'URL
						size: 0, // La taille n'est pas récupérée, on peut l'ignorer ou la calculer
						url: image.image_url // URL de l'image
					}));
					displayImportedFiles(); // Met à jour l'affichage
					importedFilesSection.show(); // Affiche la section si des images sont disponibles
				} else {
					console.warn("Aucune image sauvegardée trouvée.");
					importedFilesSection.hide(); // Cache la section si aucune image n'est trouvée
				}
			},
			error: function (xhr, status, error) {
				console.error("Erreur lors du chargement des images sauvegardées :", error);
				jQuery('.imported-files').hide(); // Cache la section en cas d'erreur
			}
		});
	}

	function loadProductImage() {
		console.log("[Produit] 🔍 Vérification de l'image du produit...");
		console.log("selectedProduct: ", selectedProduct);
		console.log("selectedVariantId: ", selectedVariantId);

		if (!selectedProduct || !selectedProduct.url_image) {
			console.warn("[Produit] ⚠️ Aucune image disponible !");
			return;
		}

		// Sélection de l'élément image
		const productImageElement = document.getElementById("productImage");

		if (!productImageElement) {
			console.error("[Produit] ❌ Erreur : L'élément #productImage n'existe pas !");
			return;
		}

		// Récupération de la première image du produit
		const productImageURL = selectedProduct.url_image.split(',')[0].trim();

		console.log("[Produit] 📷 Chargement de l'image :", productImageURL);


		productImageElement.src = selectedProduct.url_image;
		productImageElement.style.display = "block";
	}
	// Vérifie et affiche le modèle 3D si disponible
	function checkAndDisplay3DModel() {
		console.log("[3D] 🔍 Vérification du modèle 3D...");

		// Vérifier que selectedProduct existe bien
		if (!selectedProduct || !selectedProduct.url_3d) {
			console.warn("[3D] ⚠️ Aucun modèle 3D défini dans selectedProduct !");
			return;
		}

		console.log("[3D] 📦 Contenu de selectedProduct.url_3d :", selectedProduct.url_3d);
		console.log("[3D] 🏷️ selectedVariantId :", selectedVariantId);

		const product3DContainer = document.getElementById("product3DContainer");
		if (!product3DContainer) {
			console.warn("[3D] ⚠️ Conteneur 3D introuvable !");
			return;
		}

		// Vérifier que selectedVariantId est bien défini
		if (!selectedVariantId) {
			console.warn("[3D] ⚠️ Aucun ID de variante sélectionné !");
			product3DContainer.style.display = "none";
			return;
		}

		// Convertir l'ID en string pour s'assurer qu'il correspond aux clés de l'objet
		let variantIdStr = String(selectedVariantId);
		console.log("[3D] 🛠️ Type de selectedProduct.url_3d :", typeof selectedProduct.url_3d);
		console.log("[3D] 🛠️ Valeur brute de selectedProduct.url_3d :", selectedProduct.url_3d);
		if (typeof selectedProduct.url_3d === "string") {
			try {
				selectedProduct.url_3d = JSON.parse(selectedProduct.url_3d);
				console.log("[3D] 🔄 Conversion en objet :", selectedProduct.url_3d);
			} catch (error) {
				console.error("[3D] ❌ Erreur de conversion JSON :", error);
			}
		}

		console.log("[3D] 🔎 Clés disponibles dans selectedProduct.url_3d :", Object.keys(selectedProduct.url_3d));

		// Récupérer le modèle 3D correspondant
		let selectedModelUrl = selectedProduct.url_3d[variantIdStr];

		if (!selectedModelUrl) {
			console.warn(`[3D] ⚠️ Aucun modèle 3D trouvé pour la variante ID: ${variantIdStr}`);
			product3DContainer.style.display = "none";
			return;
		}

		console.log("[3D] ✅ Modèle 3D sélectionné :", selectedModelUrl);
		product3DContainer.style.display = "block";
		init3DScene(selectedModelUrl, "product3DContainer");
	}



	// Appel au moment de l’ouverture du modal
	customizeButton.on('click', function () {
		console.log("[Modal] 🔄 Ouverture du modal...");
		customizeModal.show();
		loadProductImage();
		checkAndDisplay3DModel();
	});


	// Fonction pour charger l'image du produit sur le canvas à l'ouverture du modal
	// Ouvrir le modal principal
	customizeButton.on('click', function () {
		customizeModal.show();
		loadProductImage();
		checkAndDisplay3DModel();
	});

	// Gestion du clic sur le bouton "Supprimer"
	pcFilesList.on('click', '.delete-button', function () {
		const fileIndex = jQuery(this).data('index'); // Récupérer l'index du fichier
		importedFiles.splice(fileIndex, 1); // Supprimer le fichier de la liste
		displayImportedFiles(); // Mettre à jour l'affichage
	});

	// Gestion du clic sur le bouton "Sélectionner"
	jQuery(siteFilesList).on('click', '.select-image-button', function () {
		const imageUrl = jQuery(this).data('image-url');
		console.log("[UI] ✅ Image sélectionnée :", imageUrl);

		if (typeof CanvasManager !== "undefined" && CanvasManager.addImage) {
			CanvasManager.addImage(imageUrl); // Ajoute l'image dans Fabric.js
			jQuery('#imageSourceModal').hide(); // Ferme la modale
			jQuery('#addImageButton').hide();   // Cache le bouton
		}
	});


	jQuery(pcFilesList).on('click', '.image-thumbnail', function () {
		const imageUrl = jQuery(this).data('image-url');
		console.log("[UI] ✅ Image PC sélectionnée :", imageUrl);

		if (typeof CanvasManager !== "undefined" && CanvasManager.addImage) {
			CanvasManager.addImage(imageUrl);
			jQuery('#imageSourceModal').hide();
			jQuery('#addImageButton').hide();
		}
	});


	jQuery(siteFilesList).on('click', '.image-thumbnail', function () {
		const imageUrl = jQuery(this).data('image-url');
		const promptText = jQuery(this).closest('.site-image').find('.image-details span:contains("Prompt")').text();
	});
	// Gestion de la recherche dans la barre de recherche
	jQuery('#searchInput').on('input', function () {
		const searchValue = jQuery(this).val().toLowerCase(); // Récupère et convertit la recherche en minuscule
		jQuery('#siteFilesList .site-image').each(function () {
			const promptText = jQuery(this).find('.image-details span:nth-child(2)').text().toLowerCase(); // Récupère le texte du prompt
			if (promptText.includes(searchValue)) {
				jQuery(this).show(); // Affiche l'image si elle correspond
			} else {
				jQuery(this).hide(); // Cache l'image sinon
			}
		});
	});
	// Gestion de la recherche dans les fichiers importés depuis le PC
	jQuery('#searchInput').on('input', function () {
		const searchValue = jQuery(this).val().toLowerCase(); // Récupérer la recherche en minuscule
		jQuery('#pcFilesList .site-image').each(function () {
			// Récupérer l'URL sans extension
			const fileUrl = jQuery(this).find('.image-thumbnail').attr('src');
			const fileNameWithoutExt = fileUrl.split('/').pop().split('.').slice(0, -1).join('.').toLowerCase(); // Récupère l'URL sans extension

			// Vérifier si la recherche correspond au nom de fichier sans extension
			if (fileNameWithoutExt.includes(searchValue)) {
				jQuery(this).show(); // Affiche si correspondance
			} else {
				jQuery(this).hide(); // Cache sinon
			}
		});
	});


});
