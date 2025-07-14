var baseUrl = window.location.origin;
var cropper;
let allImages = []; // Tableau pour stocker toutes les images
let originalFile = null;
let isSelectingImage = false;
let customImageUrl = null;


$(document).ready(function() {
	if (window.currentUser && document.getElementById('nickname')) {
		document.getElementById('nickname').textContent = currentUser.display_name;
	}
	if (currentUser && currentUser.ID) {
		const sidebarProfileImage = document.getElementById('profileImage');
		if (sidebarProfileImage) {
			sidebarProfileImage.src = baseUrl + '/wp-sauvegarde/user/' + currentUser.ID + '/user_logo.png';
		}
	}

       function getUrlParameter(sParam) {
               var sPageURL = window.location.search.substring(1),
                       sURLVariables = sPageURL.split('&'),
                       sParameterName,
                       i;

               for (i = 0; i < sURLVariables.length; i++) {
                       sParameterName = sURLVariables[i].split('=');

                       if (sParameterName[0] === sParam) {
                               return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
                       }
               }
               return false;
       }

       // Déterminer l'onglet initial à afficher
       var tabParam = getUrlParameter('tab');
       var initialTab = 'dashboard';
       if (tabParam) {
               initialTab = tabParam;
       } else if (getUrlParameter('triggerClick') === 'true') {
               initialTab = 'pictures';
       }

       // Charger l'onglet initial immédiatement
       var initialTarget = '#' + initialTab + 'Link';
       if ($(initialTarget).length) {
               $(initialTarget).trigger('click');
       } else {
               $('#dashboardLink').trigger('click');
       }

       // Préchargement asynchrone des autres sections
       var allSections = ['dashboard', 'pictures', 'profile', 'purchases', 'loyalty', 'missions'];
       var otherSections = allSections.filter(function(s) { return s !== initialTab; });
       setTimeout(function() { preloadSections(otherSections); }, 100);

       // Précharger aussi certaines données en arrière-plan
       setTimeout(function() {
               if (typeof loadUserDetails === 'function') {
                       loadUserDetails();
               }
               if (typeof fetchUserOrders === 'function') {
                       fetchUserOrders({ prefetch: true });
               }
               if (typeof fetchMissions === 'function') {
                       fetchMissions({ prefetch: true });
               }
       }, 150);

       // Attachement des événements aux liens AJAX de manière centralisée
       $(document).on('click', '.ajax-link', function(e) {
               e.preventDefault();
               var targetFile = $(this).data('target');

               if (!targetFile) {
                       console.warn("⚠️ Le lien cliqué n'a pas de `data-target`. Ignoré.");
                       return;
               }

               loadContent(targetFile);
               updateActiveLink(this);
       });
});

// Fonctions pour charger le contenu et gérer les états actifs des liens
function loadContent(targetFile) {
        if (!targetFile) {
                console.error("❌ Aucun fichier cible spécifié pour le chargement !");
                return;
        }

        const storageKey = 'account-section-' + targetFile;
        const cached = localStorage.getItem(storageKey);

        if (cached) {
                $('#main-container').html(cached);
                runAfterLoad(targetFile);
                return;
        }

        var loadUrl = baseTemplateUrl + targetFile + ".php";
        console.log("🔄 Chargement du contenu depuis :", loadUrl);

        $('#main-container').load(loadUrl, function(response, status, xhr) {
                if (status === "error") {
                        console.error("❌ Erreur lors du chargement du contenu :", xhr.status, xhr.statusText);
                } else {
                        localStorage.setItem(storageKey, $('#main-container').html());
                        runAfterLoad(targetFile);
                }
        });
}

// Exécute les actions nécessaires après l'injection de chaque section
function runAfterLoad(targetFile) {
        verifyAndReloadProfileImage();

        if (targetFile === 'dashboard') {
                console.log("📦 Déclenchement du chargement des infos utilisateur...");
                if (!userIsLoggedIn || !currentUser || currentUser.ID <= 0) {
                        console.warn("⚠️ Aucun utilisateur connecté ou ID invalide.");
                        return;
                }
                elementChecks = { profileImage: false };
                updateProgress(100 / totalElements);
        }

       if (targetFile === 'purchases') {
               console.log("📦 Chargement des commandes utilisateur...");
               fetchUserOrders();
       }

       if (targetFile === 'pictures') {
               console.log("📦 Chargement de la galerie d'images...");
               if (typeof ImageLoader !== 'undefined' && ImageLoader.loadUserGeneratedImages) {
                       ImageLoader.loadUserGeneratedImages();
               }
       }

       if (targetFile === 'profile') {
               console.log("📦 Chargement des infos profil...");
               loadUserDetails();
               initProfileForm();
               initPasswordForm();
       }

       if (targetFile === 'missions') {
               console.log("📦 Chargement des missions...");
               if (typeof fetchMissions === 'function') {
                       fetchMissions();
               } else {
                       console.warn("⚠️ fetchMissions n'est pas défini");
               }
       }
}

// Précharger toutes les sections au chargement initial
function preloadSections(sections) {
        sections.forEach(section => {
                const key = 'account-section-' + section;
                if (!localStorage.getItem(key)) {
                        $.get(baseTemplateUrl + section + '.php', function(html) {
                                localStorage.setItem(key, html);
                        });
                }
        });
}
function verifyAndReloadProfileImage() {
	const profileImage = document.getElementById('profileImage');
	const circlePlus = document.getElementById('circlePlus');

	if (profileImage) {
		let finalImageUrl = customImageUrl
		? customImageUrl
		: baseUrl + '/wp-sauvegarde/user/' + currentUser.ID + '/user_logo.png';

		console.log("🔄 Chargement de l'image de profil :", finalImageUrl);

		// Vérifie que l'image existe vraiment avant de l'afficher
		const testImg = new Image();
		testImg.onload = function () {
			profileImage.src = finalImageUrl + '?t=' + new Date().getTime();
			profileImage.style.display = 'block';
			if (circlePlus) circlePlus.style.display = 'none';
		};
		testImg.onerror = function () {
			console.warn("❌ Aucune image de profil trouvée, affichage annulé.");
			profileImage.style.display = 'none';
			if (circlePlus) circlePlus.style.display = 'flex';
		};
		testImg.src = finalImageUrl;


		if (circlePlus) {
			circlePlus.style.display = 'none'; // ✅ Cacher le bouton +
		}
	}
}



function updateActiveLink(currentLink) {
	$('.ajax-link').removeClass('active-link');
	$(currentLink).addClass('active-link');
}

// Fonctions pour montrer et cacher des éléments
function showElement(elementId) {
	if (elementId === 'modalChoixImage') {
		resetCropper();

		let imageUrlToLoad = customImageUrl
		? customImageUrl
		: baseUrl + '/wp-sauvegarde/user/' + currentUser.ID + '/user_logo.png?t=' + new Date().getTime();

		console.log("🔍 Image chargée dans cropper :", imageUrlToLoad);

		setImagePreview(imageUrlToLoad, function() {
			initializeCropper();
		});
	}

	document.getElementById(elementId).style.display = 'flex';
}



function hideElement(elementId) {
	document.getElementById(elementId).style.display = 'none';
}

// Gestion des images avec Cropper.js
function handleImageUpload(event) {
	var reader = new FileReader();
	reader.onload = function(e) {
		resetCropper(); // 🔄 Toujours nettoyer avant
		originalFile = event.target.files[0]; // 📦 Sauvegarde le fichier original en mémoire locale

		setImagePreview(e.target.result, function() { // ✅ Affiche le nouveau fichier uploadé
			initializeCropper(); // ✅ Puis initialise dessus
		});
	};

	if (event.target.files && event.target.files.length > 0) {
		reader.readAsDataURL(event.target.files[0]);
	}
}


function setImagePreview(imageSrc, onImageReady = null) {
	console.log("🎯 setImagePreview appelé avec :", imageSrc);

	const imagePreview = document.getElementById('imagePreview');
	imagePreview.innerHTML = ''; // Vide avant d'ajouter

	const imgElement = document.createElement('img');
	imgElement.id = 'imageToCrop';
	imgElement.src = imageSrc;
	imgElement.alt = 'Image Preview';
	imgElement.style.width = '100%';

	imgElement.onload = () => {
		console.log("✅ Image affichée dans #imagePreview :", imageSrc);
		if (typeof onImageReady === 'function') {
			onImageReady(imgElement);
		}
	};

	imagePreview.appendChild(imgElement);
}

function resetCropper() {
	if (cropper) {
		cropper.destroy();
		cropper = null;
	}
	const imagePreview = document.getElementById('imagePreview');
	imagePreview.innerHTML = ''; // Vider la zone d’aperçu
}

function initializeCropper(onReadyCallback = null) {
	const imageElement = document.getElementById('imageToCrop');

	// 🔥 Correction définitive sécurisée
	if (cropper) {
		try {
			if (cropper.cropper && cropper.cropper.parentNode) {
				cropper.destroy();
			}
		} catch (e) {
			console.warn("❌ Erreur destroy cropper ignorée : ", e);
		}
	}

	if (imageElement.complete && imageElement.naturalWidth !== 0) {
		startCropper(imageElement, onReadyCallback);
	} else {
		imageElement.onload = function() {
			startCropper(imageElement, onReadyCallback);
		};
	}
}



// Séparation propre pour démarrer le cropper
function startCropper(imageElement, onReadyCallback = null) {
	cropper = new Cropper(imageElement, {
		aspectRatio: 1,
		viewMode: 2,
		dragMode: 'crop',
		autoCrop: true,
		autoCropArea: 1,
		background: false,
		movable: false,
		zoomable: false,
		scalable: false,
		rotatable: false,
		cropBoxMovable: true,
		cropBoxResizable: true,
		ready() {
			console.log("✅ Cropper prêt");

			if (typeof onReadyCallback === 'function') {
				onReadyCallback();
			}
		}
	});
}

function applyCrop() {
	if (cropper) {
		cropper.getCroppedCanvas({
			width: 256,
			height: 256
		}).toBlob(function(blob) {
			uploadCroppedImage(blob); // ➔ Plus besoin de passer cropData
		});
	} else {
		console.log("Cropper is not initialized");
	}
}

function uploadCroppedImage(blob) {
	var formData = new FormData();
	formData.append('action', 'save_cropped_image');
	formData.append('croppedImage', blob, 'user_logo.png');
	formData.append('originalImage', originalFile);

	fetch(ajaxurl, {
		method: 'POST',
		body: formData
	})
		.then(response => response.json())
		.then(data => handleImageSaveResponse(data))
		.catch(error => console.error("Error with fetch operation:", error));
}



function handleImageSaveResponse(data) {
	if (data.success) {
		updateProfileImage(data.data.url);
		hideElement('modalChoixImage');
	} else {
		console.error("Failed to save image:", data);
	}
}

function updateProfileImage(newImageUrl, skipProgressCheck = false) {
	var profileImage = document.getElementById('profileImage');
	var circlePlus = document.getElementById('circlePlus');

	// ✅ Mise à jour de la photo principale
	profileImage.src = baseUrl + newImageUrl + '?t=' + new Date().getTime();
	profileImage.style.display = 'block';
	profileImage.setAttribute('loading', 'lazy');
	circlePlus.style.display = 'none';

	// ✅ En plus : mise à jour du header si présent
	var headerProfileImage = document.querySelector('.user-profile-image');
	if (headerProfileImage) {
		headerProfileImage.src = baseUrl + newImageUrl + '?t=' + new Date().getTime();
	}

	// ✅ Vérification de progression uniquement si nécessaire
	if (!skipProgressCheck) {
		checkElement('profileImage', checkImageSrcNotEmpty);
	}
}


function checkAndDisplayProfileImage() {
	var imageUrl = baseUrl + '/wp-sauvegarde/user/' + currentUser.ID + '/user_logo.png';
	var img = new Image();
	img.onload = () => {
		document.getElementById('profileImage').src = imageUrl;
		document.getElementById('profileImage').style.display = 'block';
		document.getElementById('circlePlus').style.display = 'none';
		checkElement('profileImage', checkImageSrcNotEmpty);
	};
	img.onerror = () => {
		checkElement('profileImage', checkImageSrcNotEmpty);
	};
	img.src = imageUrl;
}

function afficherGalerie() {
	hideElement('modalChoixImage');
	isSelectingImage = true;
	$('#picturesLink').trigger('click');

	setTimeout(() => {
		ImageLoader.loadUserGeneratedImages(); // Recharge les images
		// ✅ Pas besoin de changer les handlers maintenant
	}, 300);
}



function handleGallerySelection(event) {
	const image = event.target.closest('img.preview-enlarge');
	if (!image) return;

	const src = image.getAttribute('src');

	console.log("🖼️ Image sélectionnée dans galerie :", src);

	customImageUrl = src;

	isSelectingImage = false;

	setTimeout(() => {
		console.log("🕒 Réinitialisation de cropper après sélection d'image...");
		resetCropper();

		setImagePreview(customImageUrl, function() {
			initializeCropper();
			showElement('modalChoixImage'); // on montre après initialisation
		});
	}, 50);


	$(document).off('click', '.preview-enlarge');
	$(document).on('click', '.preview-enlarge', handleImageClick);
}


