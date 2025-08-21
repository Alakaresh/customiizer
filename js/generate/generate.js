// Initialisation
if (typeof baseUrl === 'undefined') {
    var baseUrl = window.location.origin;
}
const customTextInput = document.getElementById('custom-text');
const validateButton = document.getElementById('validate-button');
let loadingToggled = false;
let upscaledImageUrls = [];
let id_image;
let prompt = "";
let settings = "";
let imageHashes = {};
let imagesSaved = false;
let humorIntervalId;
jQuery(function($) {
	function resetGenerationState() {
		resetLoadingState();
		id_image = "";
		prompt = "";
		settings = "";
		upscaledImageUrls = [];
		imagesSaved = false;

		// Effacer l'image affichée précédemment
		const currentImage = document.querySelector('#content-images img.centered-image');
		if (currentImage) {
			currentImage.remove();
		}

		// Réinitialiser la grille des images à un état d'attente_ça devrait étre dans le reset
		updateImageGrid();
	}

	// Écouteur d'événements pour DOMContentLoaded

	// Initialisation des éléments après le chargement du DOM
	const alertBox = document.getElementById('alert-box');
	const placeholderDiv = document.getElementById('placeholder');
	const validateButton = document.getElementById('validate-button');  // Assure que validateButton est chargé
	const customTextInput = document.getElementById('custom-text');  // Assure que customTextInput est chargé
	const savedPromptText = localStorage.getItem('savedPromptText');
	let fullprompt = '';

	// Si du texte a été sauvegardé, on le réinjecte dans l'input et on masque le placeholder
	if (savedPromptText) {
		customTextInput.textContent = savedPromptText;
		placeholderDiv.style.display = 'none';
		localStorage.removeItem('savedPromptText');
	}

	// Écouteur d'événements pour le bouton de validation
                validateButton.addEventListener('click', async function(e) {
                e.preventDefault();

                resetGenerationState();
                resetLoadingState();
                if (window.logger && window.logger.setRequestId) {
                        window.logger.setRequestId(null);
                }

		settings = ' --ar ' + selectedRatio;
		prompt = customTextInput.textContent.trim();  // Récupère le texte de l'input
		if (!prompt) {
			showAlert('Veuillez entrer du texte avant de générer des images.');
			return;
		}

		if (!settings) {
			showAlert("Veuillez choisir une taille d'image avant de générer des images.");
			return;
		}

		if (!currentUser.ID || currentUser.ID === 0) {
			localStorage.setItem('savedPromptText', prompt);  // Enregistre le texte dans localStorage
			showAlert("Vous devez être connecté pour générer des images.");
			openLoginModal();
			return;
		}

		const creditsEl = document.getElementById('userCredits');
		const credits = creditsEl ? parseInt(creditsEl.textContent || "0", 10) : 0;

		if (!credits || credits <= 0) {
			showAlert("Vous n'avez pas assez de crédits pour générer des images.");
			return;
		}


		// Cache l'alerte si tout est OK
		alertBox.style.display = 'none';

		// Combine prompt et settings
		fullprompt = prompt + settings;

		// Désactive le bouton pour éviter les doubles clics
		validateButton.disabled = true;
		animateLoadingWithHumor();
		updateImageGrid();
		toggleLoading();
		//updateLoading(0); // Assure l'affichage initial de la barre de chargement


		try {
                        const response = await fetch('/wp-content/themes/customiizer/includes/proxy/generate_image.php', {
                                method: 'POST',
                                headers: {
                                        'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                        prompt: fullprompt,
                                        webhook_url: baseUrl + '/wp-content/themes/customiizer/includes/webhook/imagine.php',
                                        webhook_type: 'progress',
                                        is_disable_prefilter: false
                                })
                        });

			if (!response.ok) throw new Error("Échec de la récupération du statut de l'image");

                        const data = await response.json();

                        if (data.requestId && window.logger && window.logger.setRequestId) {
                                window.logger.setRequestId(data.requestId);
                                logger.log('info', 'Requête génération acceptée', {requestId: data.requestId});
                        }

                        if (data.status === 'success') {
                                id_image = data.data.hash;
                                setTimeout(() => checkStatus(), 1000);

				// 💳 Décrémentation des crédits si succès
				const creditsEl = document.getElementById('userCredits');
				if (creditsEl) {
					let currentCredits = parseInt(creditsEl.textContent || "0", 10);
					if (!isNaN(currentCredits) && currentCredits > 0) {
						currentCredits -= 1;
						creditsEl.textContent = currentCredits;

						// 🧠 Cache sessionStorage à jour
						const cached = sessionStorage.getItem('USER_ESSENTIALS');
						if (cached) {
							let cacheData = JSON.parse(cached);
							if (cacheData.user_id === currentUser.ID) {
								cacheData.image_credits = currentCredits;
								sessionStorage.setItem('USER_ESSENTIALS', JSON.stringify(cacheData));
							}
						}

						// 🔄 Synchro serveur
						await updateCreditsInDB(currentUser.ID);
					}
				}

				lastUpdateTime = Date.now();
				lastProgress = 15;

			} else {
				console.error("❌ Erreur dans les données reçues :", data.message);
				showAlert("Une erreur est survenue pendant la génération. Veuillez réessayer.");
			}

		} catch (error) {
			console.error("❌ Erreur de la requête POST:", error);
			showAlert("Une erreur réseau est survenue. Vérifiez votre connexion ou réessayez plus tard.");
			validateButton.disabled = false;
		}


		// Affiche une alerte
		function showAlert(message) {
			alertBox.textContent = message;
			alertBox.style.display = 'block';
		}
	});

	// Fonction pour vérifier le statut de la génération d'image
	const checkStatus = async () => {
		logger.log('[🔍 checkStatus] Lancement du check de génération...');

		try {
			const response = await jQuery.ajax({
				url: ajaxurl,
				method: 'POST',
				data: {
					action: 'check_image_status',
					hash: id_image
				}
			});

			if (response.success) {
				const statusData = response.data;
				logger.log('[✅ checkStatus] Réponse reçue :', statusData);

				let url = statusData.result?.url || null;
				let displayedUrl = url;

				// Proxifier si nécessaire
				if (url && url.includes('cdn.discordapp.com')) {
					displayedUrl = baseUrl + '/wp-content/themes/customiizer/includes/proxy/proxy_discord.php?url=' + encodeURIComponent(url);
				}

				// 🔄 Nettoyage DOM
				const $container = $('#content-images');
				const $existing = $container.find('img.centered-image');

				if ($existing.length > 0) {
					logger.log('[🧹] Suppression de', $existing.length, 'ancienne(s) image(s)');
					$existing.each(function() {
						jQuery.removeData(this); // Supprime les data() jQuery
					});
					$existing.remove();
				}

				if (url && statusData.progress > 0) {
					logger.log('[🖼️] Insertion de la nouvelle image générée');

                                        const promptText = typeof prompt === 'object'
                                            ? (prompt.text || prompt.prompt || JSON.stringify(prompt))
                                            : (prompt || '');

                                        const $newImage = $('<img>')
                                        .attr('src', displayedUrl)
                                        .attr('alt', 'Generated Image')
                                        .attr('data-display_name', currentUser.display_name || '')
                                        .attr('data-user-logo', currentUser.user_logo || '')
                                        .attr('data-user-id', currentUser.ID || '')
                                        .attr('data-format-image', selectedRatio || '')
                                        .attr('data-prompt', promptText)
                                        .addClass('centered-image preview-enlarge');

					$container.append($newImage);
					logger.log('[✅] Image insérée avec attributs :');
					logger.log('[data-display_name]:', $newImage.attr('data-display_name'));
					logger.log('[data-user-id]:', $newImage.attr('data-user-id'));
					logger.log('[data-format-image]:', $newImage.attr('data-format-image'));
					logger.log('[data-prompt]:', $newImage.attr('data-prompt'));

					$('#image-grid').hide();
				} else {
					logger.log('[🕐] Image pas encore prête, affichage d’attente');
					$container.append(`
					<img src="/wp-content/themes/customiizer/images/customiizerSiteImages/attente.png"
						alt="En cours..."
						class="centered-image">`);
					$('#image-grid').hide();
				}

				// 💡 Mise à jour de la barre de chargement
				if (statusData.progress > 0) {
					logger.log('[📶] Progression :', statusData.progress, '%');
					updateLoading(statusData.progress);
				}

				// ✅ Si fini → upscale
				if (statusData.status === "done") {
					logger.log('[🎉] Génération terminée ! Lancement des upscales...');
					updateLoading(100);
					$('#validate-button').prop('disabled', false);

					for (let choice = 1; choice <= 4; choice++) {
						try {
							const upscaleResponse = await fetch('/wp-content/themes/customiizer/includes/proxy/upscale.php', {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json'
								},
								body: JSON.stringify({
									hash: id_image,
									choice: choice,
									webhook_url: baseUrl + '/wp-content/themes/customiizer/includes/webhook/upscale.php',
									webhook_type: 'result',
								})
							});

                                                        const upscaleData = await upscaleResponse.json();
                                                        if (upscaleData.status === 'success') {
                                                                logger.log(`[🆙] Upscale #${choice} lancé :`, upscaleData.data.hash, {requestId: upscaleData.requestId});
                                                                imageHashes[choice] = upscaleData.data.hash;
                                                        }
						} catch (upscaleError) {
							console.error(`❌ Upscale ${choice} échoué :`, upscaleError);
						}
					}

					checkAllChoicesSaved(imageHashes);
					return;
				}
			} else {
				console.error('[❌] Erreur dans la réponse serveur :', response.data);
			}
		} catch (error) {
			console.error("[❌] Erreur AJAX lors du check :", error);
		}

		// ⏱️ Re-vérifie après un petit délai
		logger.log('[🔁] Re-vérification dans 500ms...');
		setTimeout(() => checkStatus(id_image), 500);
	};



	// Fonction pour vérifier si toutes les images upscalées sont sauvegardées
	const checkAllChoicesSaved = async (hashes) => {
		const checkInterval = 1000;
		const maxChecks = 60;
		let checks = 0;
		let intervalId;

		const intervalCallback = async () => {
			try {
				let allChoicesAvailable = true;
				let choices = {};

				for (let choice = 1; choice <= 4; choice++) {
					const hash = hashes[choice];
					if (hash) {
						const response = await jQuery.ajax({
							url: ajaxurl,
							method: 'POST',
							data: {
								action: 'check_image_choices',
								hash: hash
							}
						});

						if (response.success) {
							const choiceData = response.data;
							choices[`image_choice_${choice}`] = {
								url: choiceData[`image_choice_${choice}`],
								hash: hash
							};
							if (!choiceData[`image_choice_${choice}`]) allChoicesAvailable = false;
						} else {
							allChoicesAvailable = false;
						}
					} else {
						allChoicesAvailable = false;
					}
				}

				if (allChoicesAvailable && !imagesSaved) {
					clearInterval(intervalId);
					imagesSaved = true;
					displayAndSaveImage(choices);
					for (let choice = 1; choice <= 4; choice++) {
						const hash = hashes[choice];
						deleteImageTask(hash);
					}
					deleteImageTask(id_image);
					return;
				}

				checks++;
				if (checks >= maxChecks) {
					clearInterval(intervalId);
					console.error('Temps de vérification dépassé.');
				}
			} catch (error) {
				console.error('Erreur lors de la vérification des choix upscalés:', error);
				clearInterval(intervalId);
			}
		};

		intervalId = setInterval(intervalCallback, checkInterval);
	};
        async function updateCreditsInDB(userId) {
                try {
                        const response = await fetch(ajaxurl, {
                                method: 'POST',
                                headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                },
                                body: `action=decrement_credits&user_id=${encodeURIComponent(userId)}`
                        });
                        if (!response.ok) throw new Error('Échec de décrémentation côté serveur');
                        const data = await response.json();
                        logger.log("✅ Crédits décrémentés côté serveur");
                        if (data.missions_completed && data.missions_completed.length) {
                                // Notifications are handled elsewhere
                        }
                } catch (error) {
                        console.error('❌ Erreur côté serveur pour décrémenter les crédits :', error);
                }
	}

	// Fonction pour afficher et sauvegarder les images
	async function displayAndSaveImage(choices) {
		const upscaledUrls = [1, 2, 3, 4].map(choice => choices[`image_choice_${choice}`]);

		if (upscaledUrls && upscaledUrls.length > 0) {
			const savePromises = upscaledUrls.map((choiceData, index) => {
				if (choiceData && choiceData.url) {
					const savedImageUrl = 'https://customiizer.blob.core.windows.net/imageclient/' + currentUser.ID + '/' + (index + 1) + '_' + id_image + '.webp';

					// Utiliser Promise.all pour effectuer saveImageUrl et saveImageData simultanément
					return Promise.all([
						saveImageUrl(choiceData.url, savedImageUrl, index + 1),
						saveImageData(savedImageUrl, index + 1, choiceData.hash)
					])
						.then(() => {
						// Préparer les données à ajouter à allImages
						const newImageInfo = {
							image_url: savedImageUrl,
							user_login: currentUser.display_name,
							customer_id: currentUser.ID,
							upscaled_id: choiceData.hash,
							format_image: selectedRatio,
							prompt: prompt
						};
						// Mettre à jour allImages avec les nouvelles informations
						allImages.push(newImageInfo);
						return { imageUrl: savedImageUrl, index: index };
					})
						.catch(error => {
						console.error(`Erreur lors de la sauvegarde de l'image index ${index + 1}:`, error); // Log des erreurs
						return null;
					});
				} else {
					console.error(`URL manquante pour l'index ${index}`); // Log si l'URL est manquante
					return null;
				}
			});

			const results = await Promise.all(savePromises);

			// Mettre à jour la grille une fois que toutes les images sont sauvegardées
			results.forEach(result => {
				if (result) {
					updateImageInGrid(result.imageUrl, result.index);
				}
			});

			// Cacher l'image actuelle après avoir ajouté les nouvelles images dans la grille
			const currentImage = $('#content-images img.centered-image');
			if (currentImage.length > 0) {
				currentImage.hide();
			}

			// Afficher la grille après avoir mis à jour les images
			const grid = document.getElementById('image-grid');
			if (grid) {
				toggleLoading();
				grid.style.display = 'grid';
			}
		} else {
			console.error("Aucune URL upscalée trouvée"); // Log si aucune URL upscalée n'est trouvée
		}
	}

	// Fonction pour mettre à jour une image dans la grille
	function updateImageInGrid(imageUrl, index) {
		const grid = document.getElementById('image-grid');
		const imageContainers = grid.querySelectorAll('.image-container');
		if (imageContainers && imageContainers.length > index) {
			const imgElement = imageContainers[index].querySelector('img');
			if (imgElement) {
				imgElement.src = imageUrl;

				// ✅ Ajout des bons data-* pour prévisualisation correcte
				imgElement.setAttribute('data-display_name', currentUser.display_name || '');
				imgElement.setAttribute('data-user-logo', currentUser.user_logo || '');
				imgElement.setAttribute('data-user-id', currentUser.ID || '');
                                imgElement.setAttribute('data-format-image', selectedRatio || '');
                                const promptTextUpdate = typeof prompt === 'object'
                                    ? (prompt.text || prompt.prompt || JSON.stringify(prompt))
                                    : (prompt || '');
                                imgElement.setAttribute('data-prompt', promptTextUpdate);
			}
		}
	}


	// Fonction pour sauvegarder l'URL de l'image
	async function saveImageUrl(url, savedImageUrl, imagePrefix) {
		const requestBody = `url=${encodeURIComponent(url)}&` +
			  `name=${encodeURIComponent(id_image)}&` +
			  `prefix=${encodeURIComponent(imagePrefix)}&` +
			  `ratio=${encodeURIComponent(selectedRatio)}`;
		const response = await fetch(baseUrl + '/wp-admin/admin-ajax.php?action=save_image_from_url', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: requestBody
		});
		if (!response.ok) {
			const errorText = await response.text(); // ← contenu exact renvoyé par PHP
			console.error('Détail du 500 :', errorText);
			throw new Error('Échec de la sauvegarde de l\'URL de l\'image.');
		}


		return await response.text();
	}

	// Fonction pour sauvegarder les données de l'image
	async function saveImageData(savedImageUrl, imagePrefix, hash) {
		const requestBody = `customer_id=${encodeURIComponent(currentUser.ID)}&` +
			  `image_url=${encodeURIComponent(savedImageUrl)}&` +
			  `source_id=${encodeURIComponent(id_image)}&` +
			  `upscaled_id=${encodeURIComponent(hash)}&` +
			  `image_prefix=${encodeURIComponent(imagePrefix)}&` +
			  `prompt=${encodeURIComponent(prompt)}&` +
			  `format_image=${encodeURIComponent(selectedRatio)}&` +
			  `settings=${encodeURIComponent(settings)}`;
		const response = await fetch(baseUrl + '/wp-admin/admin-ajax.php?action=save_image_data', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: requestBody
		});
		if (!response.ok) {
			throw new Error('Échec de la sauvegarde des données de l\'image.');
		}
		return await response.text();
	}

	// Fonction pour supprimer une tâche d'image
	const deleteImageTask = async (id) => {
		try {
			const response = await jQuery.ajax({
				url: ajaxurl,
				method: 'POST',
				data: {
					action: 'delete_image_task',
					hash: id
				}
			});

			if (response.success) {
				return;
			} else {
				console.error('Erreur:', response.data.message);
			}
		} catch (error) {
			console.error('Erreur AJAX:', error);
		}
	};

	// Autres fonctions utilitaires
	function displaySmallImages(images) {
		var imageContainer = document.getElementById('image-small');
		if (!imageContainer) {
			console.error("Le conteneur des images de produits est introuvable.");
			return;
		}

		imageContainer.innerHTML = '';

		if (images.length > 0) {
			var imageUrl = images[0];

			var img = document.createElement('img');
			img.src = imageUrl;
			img.alt = 'Image du produit';
			img.classList.add('small-image'); 

			imageContainer.appendChild(img);
		} else {
			console.error("Aucune image disponible pour ce produit.");
		}
	}

	function updateImageGrid() {
		const gridImages = document.querySelectorAll('.image-grid img');
		gridImages.forEach(image => {
			image.src = '/wp-content/themes/customiizer/images/customiizerSiteImages/attente.png';
			image.alt = 'image d\'attente';
		});
	}

	function resetLoadingState() {
		const loadingBar = document.getElementById('loading-bar');
		const loadingText = document.getElementById('loading-text');
		if (loadingBar) {
			loadingBar.style.width = '0%';
		}
		if (loadingText) {
			loadingText.textContent = 'Notre IA est en pleine méditation créative...';
		}
		loadingToggled = false;
	}

	function toggleLoading() {
		const loadingContainer = document.querySelector('.loading-container');
		loadingContainer.classList.toggle('hide');
	}

	function animateLoadingWithHumor() {
		const humorousPhrases = [
			"L'IA prend son café...", 
			"Les pixels se mettent en place... doucement.", 
			"Les algorithmes dansent la valse des neurones...", 
			"Consultation du manuel 'Comment créer une œuvre d'art'...", 
			"Préparation de l'image parfaite (ou presque)...", 
			"Les maths font leur magie en coulisse...", 
			"Génération de quelque chose de vraiment cool...", 
			"Application de la sauce IA secrète...", 
			"Vérification des probabilités de chef-d'œuvre...", 
			"En train de demander l'aide d'un supercalculateur..." 
		];
		let currentIndex = 0;

		// Vérifiez si un intervalle humoristique est déjà actif, le cas échéant, le nettoyer
		if (humorIntervalId) {
			clearInterval(humorIntervalId);
		}

		// Démarre l'animation des phrases humoristiques
		humorIntervalId = setInterval(() => {
			if (currentIndex >= humorousPhrases.length) {
				currentIndex = 0; // Recommence depuis le début si toutes les phrases ont été affichées
			}
			updateLoadingText(humorousPhrases[currentIndex]);
			currentIndex++;
		}, 2500);
	}

	function animateCompletionWithHumor() {
		const completionPhrases = [
			"L'IA met les derniers coups de pinceau ...",
			"Raffinement final... presque prêt à vous épater !",
			"Encore un peu de magie... L'image est en cours de finition...",
			"L'IA ajuste les derniers détails pour la perfection...",
			"Finalisation en cours... C'est bientôt prêt !",
			"Derniers réglages... L'image arrive dans un instant...",
			"Votre image est en train de recevoir sa touche finale...",
			"Optimisation des pixels pour un rendu optimal...",
			"L'IA prend un pas de recul pour admirer... c'est presque prêt.",
			"Finalisation... Préparez-vous à voir le résultat !"
		];
		let currentIndex = 0;

		// Afficher immédiatement la première phrase
		updateLoadingText(completionPhrases[currentIndex]);
		currentIndex++;

		// Démarre l'animation des phrases humoristiques pour la fin de génération
		humorIntervalId = setInterval(() => {
			if (currentIndex >= completionPhrases.length) {
				currentIndex = 0; // Recommence depuis le début si toutes les phrases ont été affichées
			}
			updateLoadingText(completionPhrases[currentIndex]);
			currentIndex++;
		}, 2500);
	}

	function updateLoading(percent) {
		const loadingBar = document.getElementById('loading-bar');
		const loadingText = document.getElementById('loading-text');

		// Vérifie que les éléments existent
		if (!loadingBar || !loadingText) {
			console.error("Erreur : La barre de chargement ou le texte est introuvable.");
			return; // Arrête l'exécution de la fonction si un élément est manquant
		}

		// Met à jour la largeur de la barre de chargement en fonction du pourcentage
		loadingBar.style.width = `${percent}%`;

		// Met à jour le texte du pourcentage
		loadingText.textContent = percent > 0 ? `Chargement : ${percent}%` : '';

		// Arrête l'animation humoristique lorsque les pourcentages réels sont disponibles
		if (percent > 0 && humorIntervalId) {
			clearInterval(humorIntervalId);
			humorIntervalId = null; // Assurez-vous qu'il est réinitialisé
		}

		// Quand le chargement atteint 100 %, commencez les phrases humoristiques de fin de génération
		if (percent === 100) {
			animateCompletionWithHumor();
		}
	}

	function updateLoadingText(text) {
		const loadingText = document.getElementById('loading-text');

		// Vérifie que l'élément existe
		if (!loadingText) {
			console.error("Erreur : Le texte de chargement est introuvable.");
			return;
		}

		// Met à jour le texte du chargement avec une phrase humoristique
		loadingText.textContent = text;
	}

        async function updateCredits() {
                try {
                        const response = await fetch(ajaxurl, {
                                method: 'POST',
                                headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                },
                                body: `action=decrement_credits&user_id=${encodeURIComponent(currentUser.ID)}`
                        });
                        if (!response.ok) {
                                throw new Error('Échec de la mise à jour des crédits dans la base de données.');
                        }
                        const data = await response.json();
                        if (data.missions_completed && data.missions_completed.length) {
                                // Notifications are handled elsewhere
                        }
                } catch (error) {
                        console.error('Erreur de décrémentation des crédits:', error);
                }
	}
});