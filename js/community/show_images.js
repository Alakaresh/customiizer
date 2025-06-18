const userId = currentUser.ID; // Utiliser ton objet PHP existant
const cacheKey = `community_images_${userId || 'guest'}`;
let allImages = [];

jQuery(document).ready(function($) {
	const startTime = performance.now();
	const cachedImages = sessionStorage.getItem(cacheKey);
	if (cachedImages) {
		allImages = JSON.parse(cachedImages);
		displayImages(allImages);
	} else {
		fetchImagesFromAPI();
	}
	function fetchImagesFromAPI() {
		fetch(`${baseUrl}/wp-json/api/v1/images/load?user_id=${userId}`)
			.then(response => response.json())
			.then(data => {
			if (data.success) {
				allImages = data.images;
				sessionStorage.setItem(cacheKey, JSON.stringify(allImages));
				displayImages(allImages);
				const endTime = performance.now();
			} else {
				console.error('[AJAX] ❌ Aucune image trouvée.');
			}
		})
			.catch(error => {
			console.error('[AJAX] ❌ Erreur de récupération des images:', error);
		});
	}

	function shuffleArray(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

	function getQueryParam(param) {
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.get(param);
	}

	function initializeColumns() {
		const columns = [];
		for (let i = 0; i < 5; i++) {
			columns.push($('<div/>', { class: 'image-column' }));
		}
		return columns;
	}

	function displayImages(images) {

		// ✨ Travailler sur une copie des images
		const imagesToDisplay = [...images];
		const userFilter = getQueryParam('user');
		let filteredImages = images;

		if (userFilter) {
			filteredImages = images.filter(image => image.display_name === userFilter);
		}

		const columns = initializeColumns();
		let columnIndex = 0;

		filteredImages.forEach(function(image) {
			const imageDiv = $('<div/>', {
				class: 'imageContainer',
				'data-image-id': image.image_number,
				'data-prompt': (image.prompt || '').toLowerCase()
			});

			const likeIcon = $('<i/>', {
				class: image.liked_by_user === true ? 'fas fa-heart like-icon liked' : 'far fa-heart like-icon',
				title: 'Like'
			});

			const starIcon = $('<i/>', {
				class: image.favorited_by_user === true ? 'fas fa-star star-icon favorited' : 'far fa-star star-icon',
				title: 'Favori'
			});


			if (!userId || userId === 0) {
				likeIcon.addClass('disabled');
				starIcon.addClass('disabled');
			}

        const img = $('<img/>', {
                src: image.image_url,
                alt: 'Generated Image',
                class: 'preview-enlarge',
                'data-user-id': userId || '',    // Ajouté
                'data-display_name': image.display_name || '',  // Ajouté
                'data-format-image': image.format || '', // Ajouté
                'data-prompt': image.prompt || '', // Ajouté
                loading: 'lazy'
        });


			const overlayDiv = $('<div/>', { class: 'overlay', style: 'display: none;' });
			const userLoginLink = $('<a/>', {
				href: window.location.pathname + '?user=' + image.display_name,
				text: image.display_name,
				class: 'user-login-link'
			});

			const iconOverlayDiv = $('<div/>', { class: 'icon-overlay', style: 'display: none;' });
			iconOverlayDiv.append(likeIcon, starIcon);

			overlayDiv.append(userLoginLink);
			overlayDiv.data('prompt', image.prompt);

			img.on('load', function() {
				overlayDiv.fadeIn(); // Facultatif : pour plus de fluidité
				imageDiv.append(img, iconOverlayDiv, overlayDiv);
				columns[columnIndex].append(imageDiv);
				$('.imageContainer').hover(
					function() {
						$(this).find('.overlay').fadeIn();
						$(this).find('.icon-overlay').css('display', 'flex').fadeIn();
					}, function() {
						$(this).find('.overlay').fadeOut();
						$(this).find('.icon-overlay').fadeOut(function() {
							$(this).css('display', 'none');
						});
					}
				);
				columnIndex = (columnIndex + 1) % 5;
			});


		});

		const container = $('<div/>', { class: 'image-container' });
		columns.forEach(function(column) { container.append(column); });
		$('#image-container').html(container);

		enableImageEnlargement();
	}


	// Événements sur les icônes
	$(document).on('click', '.like-icon', function() {
		if (!userId || userId === 0) {
			alert("Vous devez être connecté pour liker.");
			return;
		}
		const imageId = $(this).closest('.imageContainer').data('image-id');
		toggleLike(imageId, this);
	});

	$(document).on('click', '.star-icon', function() {
		if (!userId || userId === 0) {
			alert("Vous devez être connecté pour ajouter en favori.");
			return;
		}
		const imageId = $(this).closest('.imageContainer').data('image-id');
		toggleFavorite(imageId, this);
	});

	function toggleLike(imageId, iconElement) {
		fetch(`${baseUrl}/wp-json/api/v1/images/like`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ user_id: userId, image_id: imageId })
		})
			.then(res => res.json())
			.then(data => {
			if (data.success) {
				$(iconElement).toggleClass('fas far');
				$(iconElement).toggleClass('liked');

				const imageToUpdate = allImages.find(img => String(img.image_number) === String(imageId));
				if (imageToUpdate) {
					imageToUpdate.liked_by_user = !imageToUpdate.liked_by_user;
					sessionStorage.setItem(cacheKey, JSON.stringify(allImages));
				} else {
					console.warn("[Update] Aucune image trouvée pour mettre à jour le like.");
				}
			} else {
				console.error("[Error] Echec Like :", data);
			}
		})
			.catch(error => {
			console.error("[Error] Erreur Like :", error);
		});
	}



	function toggleFavorite(imageId, iconElement) {
		fetch(`${baseUrl}/wp-json/api/v1/images/favorite`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ user_id: userId, image_id: imageId })
		})
			.then(res => res.json())
			.then(data => {
			if (data.success) {
				$(iconElement).toggleClass('fas far');
				$(iconElement).toggleClass('favorited');

				const imageToUpdate = allImages.find(img => String(img.image_number) === String(imageId));
				if (imageToUpdate) {
					imageToUpdate.favorited_by_user = !imageToUpdate.favorited_by_user;
					sessionStorage.setItem(cacheKey, JSON.stringify(allImages));
				} else {
					console.warn("[Update] Aucune image trouvée pour mettre à jour le favori.");
				}
			} else {
				console.error("[Error] Echec Favori :", data);
			}
		})
			.catch(error => {
			console.error("[Error] Erreur Favori :", error);
		});
	}


	// Tri Explorer (aléatoire)
	$('#sort-explore').on('click', function() {
		console.log("[Tri] Mode Explore activé.");
		$(this).addClass('active');
		$('#sort-likes').removeClass('active');
		shuffleArray(allImages);
		displayImages(allImages);
	});

	// Tri par nombre de Likes
	$('#sort-likes').on('click', function() {
		console.log("[Tri] Mode Likes activé.");
		$(this).addClass('active');
		$('#sort-explore').removeClass('active');
		allImages.sort((a, b) => b.likes - a.likes);
		displayImages(allImages);
	});
	function normalizeText(text) {
		return text
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.trim();
	}
	function levenshteinDistance(a, b) {
		const m = a.length;
		const n = b.length;
		const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

		for (let i = 0; i <= m; i++) dp[i][0] = i;
		for (let j = 0; j <= n; j++) dp[0][j] = j;

		for (let i = 1; i <= m; i++) {
			for (let j = 1; j <= n; j++) {
				if (a[i - 1] === b[j - 1]) {
					dp[i][j] = dp[i - 1][j - 1];
				} else {
					dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
				}
			}
		}
		return dp[m][n];
	}

	$(document).on('input', '#search-input', function () {
		const rawSearch = $(this).val();
		const searchWords = normalizeText(rawSearch)
		.split(/\s+/)
		.map(w => w.replace(/[^a-z0-9]/gi, ''));

		const maxDistance = 2;

		$('.imageContainer').each(function () {
			const rawPrompt = $(this).data('prompt') || '';
			const promptText = normalizeText(rawPrompt);
			const promptWords = promptText
			.split(/\s+/)
			.map(w => w.replace(/[^a-z0-9]/gi, ''));

			// Chaque mot tapé doit correspondre à un mot proche dans le prompt
			const allMatched = searchWords.every(searchWord => {
				return promptWords.some(promptWord => {
					return (
						promptWord.includes(searchWord) ||
						levenshteinDistance(promptWord, searchWord) <= maxDistance
					);
				});
			});

			$(this).toggle(allMatched);
		});
	});

});

