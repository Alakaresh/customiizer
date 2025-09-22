// Initialisation
if (typeof baseUrl === 'undefined') {
    var baseUrl = window.location.origin;
}
const LOG_PREFIX = '[Customiizer][Generate]';
console.log(`${LOG_PREFIX} Script initialisé`, { baseUrl });
const customTextInput = document.getElementById('custom-text');
const validateButton = document.getElementById('validate-button');
let loadingToggled = false;
function normaliseRatioValue(value) {
        if (!value) {
                return '';
        }

        const normalised = String(value)
                .replace(/[xX×]/g, ':')
                .replace(/\s+/g, '')
                .trim();

        const parts = normalised.split(':').map(Number);
        if (parts.length !== 2) {
                return '';
        }

        const [width, height] = parts;
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
                return '';
        }

        return `${width}:${height}`;
}

let upscaledImageUrls = [];
let id_image;
let prompt = "";
let settings = "";
let imageHashes = {};
let imagesSaved = false;
let humorIntervalId;
jQuery(function($) {
	function resetGenerationState() {
		console.log(`${LOG_PREFIX} Réinitialisation de l'état de génération`);
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

		settings = ' --ar ' + selectedRatio;
		prompt = customTextInput.textContent.trim();  // Récupère le texte de l'input
		console.log(`${LOG_PREFIX} Demande de génération reçue`, {
			prompt,
			settings,
			ratio: selectedRatio,
			userId: currentUser.ID,
		});
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
			console.log(`${LOG_PREFIX} Envoi de la requête de génération à l'API`, {
				endpoint: '/wp-content/themes/customiizer/includes/proxy/generate_image.php',
				webhook: baseUrl + '/wp-content/themes/customiizer/includes/webhook/imagine.php',
			});
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
			console.log(`${LOG_PREFIX} Réponse reçue du proxy de génération`, data);

			if (data.status === 'success') {
				id_image = data.data.hash;
				console.log(`${LOG_PREFIX} Génération acceptée`, { hash: id_image });
				setTimeout(() => checkStatus(), 1000);

				// 💳 Décrémentation des crédits si succès
				const creditsEl = document.getElementById('userCredits');
				if (creditsEl) {
					let currentCredits = parseInt(creditsEl.textContent || "0", 10);
					if (!isNaN(currentCredits) && currentCredits > 0) {
						currentCredits -= 1;
						creditsEl.textContent = currentCredits;
						console.log(`${LOG_PREFIX} Crédit consommé après génération`, { creditsRestants: currentCredits });

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
				console.log(`${LOG_PREFIX} Erreur signalée par l'API de génération`, data);
				showAlert("Une erreur est survenue pendant la génération. Veuillez réessayer.");
			}

		} catch (error) {
			console.error("❌ Erreur de la requête POST:", error);
			console.log(`${LOG_PREFIX} Erreur lors de l'appel API`, { error });
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
		console.log(`${LOG_PREFIX} Vérification du statut de génération`, { hash: id_image });
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
				console.log(`${LOG_PREFIX} Statut reçu`, {
					hash: id_image,
					status: statusData.status,
					progress: statusData.progress,
				});
				let url = statusData.result?.url || null;
				let displayedUrl = url;

				// Proxifier si nécessaire
				if (url && url.includes('cdn.discordapp.com')) {
					displayedUrl = baseUrl + '/wp-content/themes/customiizer/includes/proxy/proxy_discord.php?url=' + encodeURIComponent(url);
					console.log(`${LOG_PREFIX} URL proxifiée`, { originalUrl: url, proxiedUrl: displayedUrl });
				}

				// 🔄 Nettoyage DOM
				const $container = $('#content-images');
				const $existing = $container.find('img.centered-image');

				if ($existing.length > 0) {
					$existing.each(function() {
						jQuery.removeData(this); // Supprime les data() jQuery
					});
					$existing.remove();
				}

				if (url && statusData.progress > 0) {
					const promptText = typeof prompt === 'object'
						? (prompt.text || prompt.prompt || JSON.stringify(prompt))
						: (prompt || '');

                                        const ratioValue = normaliseRatioValue(selectedRatio || '');

                                        const $newImage = $('<img>')
                                        .attr('src', displayedUrl)
                                        .attr('alt', 'Image générée')
                                        .attr('data-display_name', currentUser.display_name || '')
                                        .attr('data-user-logo', currentUser.user_logo || '')
                                        .attr('data-user-id', currentUser.ID || '')
                                        .attr('data-format-image', ratioValue || '')
                                        .attr('data-prompt', promptText)
                                        .addClass('centered-image preview-enlarge');

                                        $container.append($newImage);
                                        if (typeof adjustImageHeight === 'function') {
                                                adjustImageHeight();
                                        }
                                        $('#image-grid').hide();
                                        console.log(`${LOG_PREFIX} Image intermédiaire affichée`, { displayedUrl });
                                } else {
                                        $container.append(`
                                        <img src="/wp-content/themes/customiizer/images/customiizerSiteImages/attente.png"
                                                alt="En cours..."
                                                class="centered-image">`);
                                        if (typeof adjustImageHeight === 'function') {
                                                adjustImageHeight();
                                        }
                                        $('#image-grid').hide();
                                }

// 💡 Mise à jour de la barre de chargement
				if (statusData.progress > 0) {
					updateLoading(statusData.progress);
					console.log(`${LOG_PREFIX} Progression mise à jour`, { progress: statusData.progress });
				}

// ✅ Si fini → upscale
				if (statusData.status === "done") {
					updateLoading(100);
					$('#validate-button').prop('disabled', false);
					console.log(`${LOG_PREFIX} Génération terminée, lancement des upscales`, { hash: id_image });

					for (let choice = 1; choice <= 4; choice++) {
						try {
							console.log(`${LOG_PREFIX} Demande d'upscale envoyée`, { baseHash: id_image, choice });
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
								imageHashes[choice] = upscaleData.data.hash;
								console.log(`${LOG_PREFIX} Upscale reçu`, {
									choice,
									hash: imageHashes[choice],
								});
							}
						} catch (upscaleError) {
							console.error(`❌ Upscale ${choice} échoué :`, upscaleError);
							console.log(`${LOG_PREFIX} Erreur lors de l'upscale`, { choice, error: upscaleError });
						}
					}

					checkAllChoicesSaved(imageHashes);
					return;
				}

			} else {
				console.error('[❌] Erreur dans la réponse serveur :', response.data);
				console.log(`${LOG_PREFIX} Réponse serveur invalide pour le statut`, response.data);
			}
		} catch (error) {
			console.error("[❌] Erreur AJAX lors du check :", error);
			console.log(`${LOG_PREFIX} Erreur AJAX lors de la vérification du statut`, { error });
		}

                // ⏱️ Re-vérifie après un petit délai
                setTimeout(() => checkStatus(id_image), 500);
                console.log(`${LOG_PREFIX} Nouvelle vérification programmée`, { hash: id_image });
        };



	// Fonction pour vérifier si toutes les images upscalées sont sauvegardées
	const checkAllChoicesSaved = async (hashes) => {
		console.log(`${LOG_PREFIX} Vérification des upscales sauvegardés`, { hashes });
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
						console.log(`${LOG_PREFIX} Vérification du hash d'upscale`, { choice, hash });
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
							console.log(`${LOG_PREFIX} Choix récupéré`, { choice, url: choiceData[`image_choice_${choice}`] });
							if (!choiceData[`image_choice_${choice}`]) allChoicesAvailable = false;
						} else {
							allChoicesAvailable = false;
							console.log(`${LOG_PREFIX} Choix indisponible`, { choice, response });
						}
                                                } else {
                                                        allChoicesAvailable = false;
                                                        console.log(`${LOG_PREFIX} Hash manquant pour le choix`, { choice });
                                                }
				}

                                if (allChoicesAvailable && !imagesSaved) {
                                        clearInterval(intervalId);
                                        imagesSaved = true;
                                        console.log(`${LOG_PREFIX} Tous les upscales sont disponibles, sauvegarde en cours`, { hashes });
                                        displayAndSaveImage(choices);
                                        for (let choice = 1; choice <= 4; choice++) {
                                                const hash = hashes[choice];
                                                deleteImageTask(hash);
                                        }
                                        deleteImageTask(id_image);
                                        console.log(`${LOG_PREFIX} Suppression des tâches de génération terminée`, { hashes, id_image });
                                        return;
                                }

                                checks++;
                                if (checks >= maxChecks) {
                                        clearInterval(intervalId);
                                        console.error('Temps de vérification dépassé.');
                                        console.log(`${LOG_PREFIX} Temps de vérification des upscales dépassé`, { hashes });
                                }
                        } catch (error) {
                                console.error('Erreur lors de la vérification des choix upscalés:', error);
                                console.log(`${LOG_PREFIX} Erreur pendant la vérification des upscales`, { error });
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
                        const data = await response.json();                        if (data.missions_completed && data.missions_completed.length) {
                                // Notifications are handled elsewhere
                        }
                } catch (error) {
                        console.error('❌ Erreur côté serveur pour décrémenter les crédits :', error);
                }
	}

	// Fonction pour afficher et sauvegarder les images
        async function displayAndSaveImage(choices) {
                console.log(`${LOG_PREFIX} Début de l'affichage et sauvegarde des images`, { choices });
                const upscaledUrls = [1, 2, 3, 4].map(choice => choices[`image_choice_${choice}`]);

                if (upscaledUrls && upscaledUrls.length > 0) {
                        const savePromises = upscaledUrls.map((choiceData, index) => {
                                if (choiceData && choiceData.url) {
                                        const savedImageUrl = 'https://customiizer.blob.core.windows.net/imageclient/' + currentUser.ID + '/' + (index + 1) + '_' + id_image + '.webp';
                                        console.log(`${LOG_PREFIX} Sauvegarde d'une image`, {
                                                originalUrl: choiceData.url,
                                                savedImageUrl,
                                                index,
                                        });

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
                                                        user_id: currentUser.ID,
                                                        upscaled_id: choiceData.hash,
                                                        format_image: selectedRatio,
                                                        prompt: prompt
                                                };
                                                // Mettre à jour allImages avec les nouvelles informations
                                                allImages.push(newImageInfo);
                                                console.log(`${LOG_PREFIX} Image sauvegardée`, newImageInfo);
                                                return { imageUrl: savedImageUrl, index: index };
                                        })
                                                .catch(error => {
                                                console.error(`Erreur lors de la sauvegarde de l'image index ${index + 1}:`, error); // Log des erreurs
                                                console.log(`${LOG_PREFIX} Erreur lors de la sauvegarde d'une image`, {
                                                        index,
                                                        error,
                                                });
                                                return null;
                                        });
                                } else {
                                        console.error(`URL manquante pour l'index ${index}`); // Log si l'URL est manquante
                                        console.log(`${LOG_PREFIX} URL manquante pour un upscale`, { index, choiceData });
                                        return null;
                                }
                        });

                        const results = await Promise.all(savePromises);
                        console.log(`${LOG_PREFIX} Résultats de sauvegarde`, results);

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
                                console.log(`${LOG_PREFIX} Grille mise à jour avec les nouvelles images`);
                        }
                } else {
                        console.error("Aucune URL upscalée trouvée"); // Log si aucune URL upscalée n'est trouvée
                        console.log(`${LOG_PREFIX} Aucune URL d'upscale disponible`, { choices });
                }
        }

	// Fonction pour mettre à jour une image dans la grille
	function updateImageInGrid(imageUrl, index) {
		const grid = document.getElementById('image-grid');
		const imageContainers = grid.querySelectorAll('.image-container');
		if (imageContainers && imageContainers.length > index) {
			const imgElement = imageContainers[index].querySelector('img');
                        if (imgElement) {
                                const ratioValue = normaliseRatioValue(selectedRatio || '');
                                imgElement.src = imageUrl;

                                // ✅ Ajout des bons data-* pour prévisualisation correcte
                                imgElement.setAttribute('data-display_name', currentUser.display_name || '');
                                imgElement.setAttribute('data-user-logo', currentUser.user_logo || '');
                                imgElement.setAttribute('data-user-id', currentUser.ID || '');
                                imgElement.setAttribute('data-format-image', ratioValue || '');
                                const promptTextUpdate = typeof prompt === 'object'
                                    ? (prompt.text || prompt.prompt || JSON.stringify(prompt))
                                    : (prompt || '');
                                imgElement.setAttribute('data-prompt', promptTextUpdate);
                                imageContainers[index].setAttribute('data-format-image', ratioValue || '');
                                console.log(`${LOG_PREFIX} Image de la grille mise à jour`, {
                                        index,
                                        imageUrl,
                                        prompt: promptTextUpdate,
                                });
                        }
                }
        }


	// Fonction pour sauvegarder l'URL de l'image
        async function saveImageUrl(url, savedImageUrl, imagePrefix) {
                console.log(`${LOG_PREFIX} Sauvegarde distante de l'URL`, {
                        sourceUrl: url,
                        savedImageUrl,
                        imagePrefix,
                });
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


                const responseText = await response.text();
                console.log(`${LOG_PREFIX} URL enregistrée`, { savedImageUrl, responseText });
                return responseText;
        }

	// Fonction pour sauvegarder les données de l'image
        async function saveImageData(savedImageUrl, imagePrefix, hash) {
                console.log(`${LOG_PREFIX} Sauvegarde des métadonnées`, {
                        savedImageUrl,
                        imagePrefix,
                        hash,
                });
                const requestBody = `user_id=${encodeURIComponent(currentUser.ID)}&` +
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
                const responseText = await response.text();
                console.log(`${LOG_PREFIX} Métadonnées sauvegardées`, {
                        savedImageUrl,
                        responseText,
                });
                return responseText;
        }

	// Fonction pour supprimer une tâche d'image
        const deleteImageTask = async (id) => {
                console.log(`${LOG_PREFIX} Suppression d'une tâche de génération`, { hash: id });
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
                                console.log(`${LOG_PREFIX} Tâche supprimée`, { hash: id });
                                return;
                        } else {
                                console.error('Erreur:', response.data.message);
                                console.log(`${LOG_PREFIX} Échec de suppression d'une tâche`, { hash: id, response });
                        }
                } catch (error) {
                        console.error('Erreur AJAX:', error);
                        console.log(`${LOG_PREFIX} Erreur AJAX lors de la suppression d'une tâche`, { hash: id, error });
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