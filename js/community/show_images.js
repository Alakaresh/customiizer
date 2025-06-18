const userId = currentUser.ID; // Utiliser ton objet PHP existant
const cacheKey = `community_images_${userId || 'guest'}`;
const imagesPerPage = 20;
let offset = 0;
let isLoading = false;
let nextColumnIndex = 0;
let allImages = [];

jQuery(document).ready(function($) {
        const cachedImages = sessionStorage.getItem(cacheKey);
        if (cachedImages) {
                allImages = JSON.parse(cachedImages);
                offset = allImages.length;
                displayImages(allImages);
        }

        fetchImagesFromAPI(allImages.length > 0);

        $(window).on('scroll', function() {
                if ($(window).scrollTop() + $(window).height() >= $(document).height() - 100) {
                        fetchImagesFromAPI(true);
                }
        });

        function fetchImagesFromAPI(append = false) {
                if (isLoading) return;
                isLoading = true;

                fetch(`${baseUrl}/wp-json/api/v1/images/load?user_id=${userId}&limit=${imagesPerPage}&offset=${offset}`)
                        .then(response => response.json())
                        .then(data => {
                        if (data.success && data.images.length > 0) {
                                if (append) {
                                        allImages = allImages.concat(data.images);
                                        appendImages(data.images);
                                } else {
                                        allImages = data.images;
                                        displayImages(allImages);
                                }
                                offset += data.images.length;
                                sessionStorage.setItem(cacheKey, JSON.stringify(allImages));
                        } else {
                                console.error('[AJAX] ❌ Aucune image trouvée.');
                        }
                })
                        .catch(error => {
                        console.error('[AJAX] ❌ Erreur de récupération des images:', error);
                })
                .finally(() => {
                        isLoading = false;
                });

	}

        function displayImages(images) {
                const userFilter = getQueryParam('user');
                let filteredImages = images;
                if (userFilter) {
                        filteredImages = images.filter(image => image.display_name === userFilter);
                }

                const columns = initializeColumns();
                nextColumnIndex = 0;

                filteredImages.forEach(function(image) {
                        const imageDiv = createImageDiv(image);
                        columns[nextColumnIndex].append(imageDiv);
                        nextColumnIndex = (nextColumnIndex + 1) % 5;
                });

                const container = $('<div/>', { class: 'image-container' });
                columns.forEach(function(column) { container.append(column); });
                $('#image-container').html(container);

                enableImageEnlargement();
        }

        function createImageDiv(image) {
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
                        loading: 'lazy',
                        'data-user-id': userId || '',
                        'data-display_name': image.display_name || '',
                        'data-format-image': image.format || '',
                        'data-prompt': image.prompt || ''
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
                        overlayDiv.fadeIn();
                });

                imageDiv.append(img, iconOverlayDiv, overlayDiv);

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

                return imageDiv;
        }

        function appendImages(images) {
                const columns = $('#image-container .image-column');
                images.forEach(function(image) {
                        const imageDiv = createImageDiv(image);
                        $(columns[nextColumnIndex]).append(imageDiv);
                        nextColumnIndex = (nextColumnIndex + 1) % 5;
                });

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

