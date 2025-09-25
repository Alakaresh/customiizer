// Initialisation
if (typeof baseUrl === 'undefined') {
    var baseUrl = window.location.origin;
}
const LOG_PREFIX = '[Customiizer][Generate]';
console.log(`${LOG_PREFIX} Script initialisé`, { baseUrl });
const customTextInput = document.getElementById('custom-text');
const validateButton = document.getElementById('validate-button');
let loadingToggled = false;
let id_image;
let prompt = "";
let settings = "";
let humorIntervalId;
const backgroundGeneration = window.CustomiizerBackgroundGeneration || null;
jQuery(function($) {
        function resetGenerationState() {
                console.log(`${LOG_PREFIX} Réinitialisation de l'état de génération`);
                resetLoadingState();
                id_image = "";
                prompt = "";
                settings = "";

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

        function showAlert(message) {
                alertBox.textContent = message;
                alertBox.style.display = 'block';
        }

        // Gestion des événements du suivi en arrière-plan
        if (backgroundGeneration) {
                backgroundGeneration.subscribe(handleBackgroundEvent);
                const existingJob = backgroundGeneration.getJob();
                if (existingJob) {
                        syncUIWithJob(existingJob);
                }
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
                toggleLoading(true);
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

                                if (backgroundGeneration) {
                                        backgroundGeneration.startTracking({
                                                hash: id_image,
                                                prompt,
                                                settings,
                                                ratio: selectedRatio,
                                                userId: currentUser.ID,
                                                displayName: currentUser.display_name || '',
                                                userLogo: currentUser.user_logo || ''
                                        });
                                } else {
                                        console.warn(`${LOG_PREFIX} Module de suivi en arrière-plan indisponible`);
                                }

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
        // Fonction pour mettre à jour une image dans la grille
        function updateImageInGrid(imageUrl, index, metadata = {}) {
                const grid = document.getElementById('image-grid');
                const imageContainers = grid.querySelectorAll('.image-container');
                if (imageContainers && imageContainers.length > index) {
                        const imgElement = imageContainers[index].querySelector('img');
                        if (imgElement) {
                                imgElement.src = imageUrl;

                                // ✅ Ajout des bons data-* pour prévisualisation correcte
                                const displayName = metadata.displayName || currentUser.display_name || '';
                                const userLogo = metadata.userLogo || currentUser.user_logo || '';
                                const userId = metadata.userId || currentUser.ID || '';
                                const format = metadata.format || selectedRatio || '';
                                const promptSource = metadata.prompt !== undefined ? metadata.prompt : prompt;
                                const promptTextUpdate = typeof promptSource === 'object'
                                    ? (promptSource.text || promptSource.prompt || JSON.stringify(promptSource))
                                    : (promptSource || '');
                                imgElement.setAttribute('data-display_name', displayName);
                                imgElement.setAttribute('data-user-logo', userLogo);
                                imgElement.setAttribute('data-user-id', userId);
                                imgElement.setAttribute('data-format-image', format);
                                imgElement.setAttribute('data-prompt', promptTextUpdate);
                                console.log(`${LOG_PREFIX} Image de la grille mise à jour`, {
                                        index,
                                        imageUrl,
                                        prompt: promptTextUpdate,
                                });
                        }
                }
        }

        function showIntermediateImage(imageUrl, jobData) {
                const $container = $('#content-images');
                const $existing = $container.find('img.centered-image');

                if ($existing.length > 0) {
                        $existing.each(function() {
                                jQuery.removeData(this);
                        });
                        $existing.remove();
                }

                const promptSource = jobData && jobData.prompt !== undefined ? jobData.prompt : prompt;
                const promptText = typeof promptSource === 'object'
                        ? (promptSource.text || promptSource.prompt || JSON.stringify(promptSource))
                        : (promptSource || '');

                if (imageUrl) {
                        const displayName = (jobData && jobData.displayName) || currentUser.display_name || '';
                        const userLogo = (jobData && jobData.userLogo) || currentUser.user_logo || '';
                        const userId = (jobData && jobData.userId) || currentUser.ID || '';
                        const format = (jobData && jobData.ratio) || selectedRatio || '';

                        const $newImage = $('<img>')
                                .attr('src', imageUrl)
                                .attr('alt', 'Image générée')
                                .attr('data-display_name', displayName)
                                .attr('data-user-logo', userLogo)
                                .attr('data-user-id', userId)
                                .attr('data-format-image', format)
                                .attr('data-prompt', promptText)
                                .addClass('centered-image preview-enlarge');

                        $container.append($newImage);
                } else {
                        $container.append(`
                                <img src="/wp-content/themes/customiizer/images/customiizerSiteImages/attente.png"
                                        alt="En cours..."
                                        class="centered-image">
                        `);
                }

                if (typeof adjustImageHeight === 'function') {
                        adjustImageHeight();
                }
                $('#image-grid').hide();
        }

        function handleImagesSaved(savedImages, jobData) {
                if (!Array.isArray(savedImages) || savedImages.length === 0) {
                        return;
                }

                const metadata = {
                        displayName: jobData && jobData.displayName ? jobData.displayName : currentUser.display_name || '',
                        userLogo: jobData && jobData.userLogo ? jobData.userLogo : currentUser.user_logo || '',
                        userId: jobData && jobData.userId ? jobData.userId : currentUser.ID || '',
                        format: jobData && jobData.ratio ? jobData.ratio : selectedRatio || '',
                        prompt: jobData && jobData.prompt !== undefined ? jobData.prompt : prompt
                };

                savedImages.forEach(result => {
                        if (result && result.imageUrl !== undefined && typeof result.index === 'number') {
                                updateImageInGrid(result.imageUrl, result.index, metadata);
                        }
                });

                const currentImage = $('#content-images img.centered-image');
                if (currentImage.length > 0) {
                        currentImage.hide();
                }

                const grid = document.getElementById('image-grid');
                if (grid) {
                        grid.style.display = 'grid';
                }

                toggleLoading(false);
                clearHumorInterval();
        }

        function clearHumorInterval() {
                if (humorIntervalId) {
                        clearInterval(humorIntervalId);
                        humorIntervalId = null;
                }
        }

        function syncUIWithJob(jobData) {
                if (!jobData) {
                        return;
                }

                if (jobData.status !== 'completed') {
                        validateButton.disabled = true;
                        toggleLoading(true);
                        if (!humorIntervalId) {
                                animateLoadingWithHumor();
                        }
                }

                if (typeof jobData.progress === 'number') {
                        updateLoading(jobData.progress);
                }

                if (jobData.displayedUrl) {
                        showIntermediateImage(jobData.displayedUrl, jobData);
                }

                if (Array.isArray(jobData.images) && jobData.images.length) {
                        handleImagesSaved(jobData.images, jobData);
                        validateButton.disabled = false;
                }

                if (jobData.stage === 'error') {
                        showAlert("Une erreur est survenue pendant la génération. Veuillez réessayer.");
                        toggleLoading(false);
                        validateButton.disabled = false;
                }
        }

        function handleBackgroundEvent(event) {
                const jobData = event.job || null;
                const payload = event.payload || {};

                switch (event.type) {
                        case 'job-started':
                                validateButton.disabled = true;
                                animateLoadingWithHumor();
                                updateImageGrid();
                                toggleLoading(true);
                                break;
                        case 'job-progress':
                                if (payload && payload.statusData && typeof payload.statusData.progress === 'number') {
                                        updateLoading(payload.statusData.progress);
                                } else if (jobData && typeof jobData.progress === 'number') {
                                        updateLoading(jobData.progress);
                                }

                                if (payload && payload.displayedUrl) {
                                        showIntermediateImage(payload.displayedUrl, jobData);
                                }
                                break;
                        case 'job-stage':
                                if (jobData && jobData.stage === 'upscaling') {
                                        animateCompletionWithHumor();
                                }
                                break;
                        case 'job-images-saved':
                                handleImagesSaved(payload.images || [], jobData);
                                validateButton.disabled = false;
                                break;
                        case 'job-completed':
                                handleImagesSaved((payload && payload.images) || (jobData && jobData.images) || [], jobData);
                                validateButton.disabled = false;
                                break;
                        case 'job-error':
                                showAlert(payload && payload.message ? payload.message : "Une erreur est survenue pendant la génération. Veuillez réessayer.");
                                toggleLoading(false);
                                validateButton.disabled = false;
                                clearHumorInterval();
                                break;
                        case 'job-restored':
                                syncUIWithJob(jobData);
                                break;
                        case 'job-cleared':
                                toggleLoading(false);
                                validateButton.disabled = false;
                                clearHumorInterval();
                                break;
                        default:
                                break;
                }
        }


	// Fonction pour sauvegarder l'URL de l'image
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

        function toggleLoading(force) {
                const loadingContainer = document.querySelector('.loading-container');
                if (!loadingContainer) {
                        return;
                }

                if (typeof force === 'boolean') {
                        if (force) {
                                loadingContainer.classList.remove('hide');
                                loadingToggled = true;
                        } else {
                                loadingContainer.classList.add('hide');
                                loadingToggled = false;
                        }
                        return;
                }

                loadingContainer.classList.toggle('hide');
                loadingToggled = !loadingContainer.classList.contains('hide');
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