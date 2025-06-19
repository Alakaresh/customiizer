const userId = currentUser.ID;
const cacheKey = `community_images_${userId || 'guest'}`;
const imagesPerLoad = 20;
let offset = 0;

// In the WordPress environment jQuery operates in no-conflict mode, so
// the global `$` alias is not defined. Define it here to reuse jQuery
// across helper functions declared outside the ready callback.
const $ = jQuery;

let allImages = [];
let filteredImages = [];
let currentIndex = 0;

jQuery(document).ready(function ($) {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
                try {
                        const parsed = JSON.parse(cached);
                        allImages = parsed.images || [];
                        offset = parsed.offset || allImages.length;
                } catch (e) {
                        allImages = [];
                }
        }

        if (allImages.length) {
                displayImages(allImages);
        } else {
                fetchImagesFromAPI(true);
        }

	$('#sort-explore').on('click', function () {
		$(this).addClass('active');
		$('#sort-likes').removeClass('active');
		shuffleArray(allImages);
		displayImages(allImages);
	});

	$('#sort-likes').on('click', function () {
		$(this).addClass('active');
		$('#sort-explore').removeClass('active');
		allImages.sort((a, b) => b.likes - a.likes);
		displayImages(allImages);
	});

	$(document).on('input', '#search-input', handleSearchInput);

	$(document).on('click', '.like-icon', function () {
		if (!userId || userId === 0) return alert("Vous devez être connecté pour liker.");
		const imageId = $(this).closest('.imageContainer').data('image-id');
		toggleLike(imageId, this);
	});

	$(document).on('click', '.star-icon', function () {
		if (!userId || userId === 0) return alert("Vous devez être connecté pour ajouter en favori.");
		const imageId = $(this).closest('.imageContainer').data('image-id');
		toggleFavorite(imageId, this);
	});

	$(document).on('mouseenter', '.imageContainer', function () {
		$(this).find('.overlay').fadeIn();
		$(this).find('.icon-overlay').css('display', 'flex').fadeIn();
	});
	$(document).on('mouseleave', '.imageContainer', function () {
		$(this).find('.overlay').fadeOut();
		$(this).find('.icon-overlay').fadeOut(function () {
			$(this).css('display', 'none');
		});
	});
});

// --- Fonctions principales ---

function fetchImagesFromAPI(initial = false) {
        const url = `${baseUrl}/wp-json/api/v1/images/load?user_id=${userId}&limit=${imagesPerLoad}&offset=${offset}`;
        return fetch(url)
                .then(res => res.json())
                .then(data => {
                        if (data.success) {
                                if (initial) {
                                        allImages = data.images;
                                } else {
                                        allImages = allImages.concat(data.images);
                                }
                                offset += data.images.length;
                                sessionStorage.setItem(cacheKey, JSON.stringify({ images: allImages, offset }));
                                if (initial) displayImages(allImages);
                                return data.images;
                        } else {
                                console.error('[AJAX] ❌ Aucune image trouvée.');
                                return [];
                        }
                })
                .catch(error => {
                        console.error('[AJAX] ❌ Erreur de récupération des images:', error);
                        return [];
                });
}

function displayImages(images) {
	const userFilter = getQueryParam('user');
	filteredImages = userFilter ? images.filter(i => i.display_name === userFilter) : images;

	const columns = initializeColumns();
	const container = $('<div/>', { class: 'image-container' });
	columns.forEach(c => container.append(c));
	$('#image-container').empty().append(container);

        currentIndex = 0;
        loadMoreImages(columns);
        // Enable click-to-preview after rendering the initial batch
        enableImageEnlargement();

	$(window).off('scroll').on('scroll', function () {
		if ($(window).scrollTop() + $(window).height() >= $(document).height() - 100) {
			loadMoreImages(columns);
		}
	});
}

function loadMoreImages(columns) {
        let colIndex = currentIndex % columns.length;
        $('#scroll-message').show();

        for (let i = 0; i < imagesPerLoad && currentIndex < filteredImages.length; i++) {
                appendImage(filteredImages[currentIndex], columns, colIndex);
                colIndex = (colIndex + 1) % columns.length;
                currentIndex++;
        }

        if (currentIndex >= filteredImages.length) {
                fetchImagesFromAPI().then(newImages => {
                        const userFilter = getQueryParam('user');
                        filteredImages = userFilter ? allImages.filter(i => i.display_name === userFilter) : allImages;
                        if (newImages.length) {
                                loadMoreImages(columns);
                        } else {
                                $('#scroll-message').text('Vous avez atteint la fin.');
                        }
                });
        } else {
                $('#scroll-message').hide();
        }
}

// --- Affichage image ---

function appendImage(image, columns, columnIndex) {
	let promptText = (typeof image.prompt === 'object') ? JSON.stringify(image.prompt) : (image.prompt || '');

	let imageUrl = '';
	if (typeof image.image_url === 'object') {
		imageUrl = image.image_url.url || image.image_url.src || image.image_url.path || '';
	} else {
		imageUrl = image.image_url;
	}
	if (!imageUrl || typeof imageUrl !== 'string') {
		console.warn('[Debug] URL image invalide :', image);
		return;
	}

	const imageDiv = $('<div/>', {
		class: 'imageContainer',
		'data-image-id': image.image_number,
		'data-prompt': promptText.toLowerCase()
	});

	const likeIcon = $('<i/>', {
		class: image.liked_by_user ? 'fas fa-heart like-icon liked' : 'far fa-heart like-icon',
		title: 'Like'
	}).toggleClass('disabled', !userId);

	const starIcon = $('<i/>', {
		class: image.favorited_by_user ? 'fas fa-star star-icon favorited' : 'far fa-star star-icon',
		title: 'Favori'
	}).toggleClass('disabled', !userId);

	const img = $('<img/>', {
		src: imageUrl,
		alt: 'Generated Image',
		class: 'preview-enlarge',
		'data-user-id': userId || '',
		'data-display_name': image.display_name || '',
		'data-format-image': image.format || '',
		'data-prompt': promptText
	});

	const overlayDiv = $('<div/>', { class: 'overlay', style: 'display: none;' });
	const iconOverlay = $('<div/>', { class: 'icon-overlay', style: 'display: none;' }).append(likeIcon, starIcon);
	const userLoginLink = $('<a/>', {
		href: window.location.pathname + '?user=' + image.display_name,
		text: image.display_name,
		class: 'user-login-link'
	});
	overlayDiv.append(userLoginLink).data('prompt', image.prompt);

	imageDiv.append(img, iconOverlay, overlayDiv);
	columns[columnIndex].append(imageDiv);
}

// --- Utilitaires ---

function initializeColumns() {
	const columns = [];
	for (let i = 0; i < 5; i++) {
		columns.push($('<div/>', { class: 'image-column' }));
	}
	return columns;
}

function getQueryParam(param) {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get(param);
}

function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

function toggleLike(imageId, iconElement) {
	fetch(`${baseUrl}/wp-json/api/v1/images/like`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ user_id: userId, image_id: imageId })
	})
		.then(res => res.json())
		.then(data => {
			if (data.success) {
				$(iconElement).toggleClass('fas far').toggleClass('liked');
				updateImageMeta(imageId, 'liked_by_user');
			}
		})
		.catch(console.error);
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
				$(iconElement).toggleClass('fas far').toggleClass('favorited');
				updateImageMeta(imageId, 'favorited_by_user');
			}
		})
		.catch(console.error);
}

function updateImageMeta(imageId, key) {
	const image = allImages.find(img => String(img.image_number) === String(imageId));
	if (image) {
		image[key] = !image[key];
		sessionStorage.setItem(cacheKey, JSON.stringify(allImages));
	}
}

// --- Recherche floue ---

function normalizeText(text) {
	return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function levenshteinDistance(a, b) {
	const m = a.length, n = b.length;
	const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			dp[i][j] = (a[i - 1] === b[j - 1])
				? dp[i - 1][j - 1]
				: 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
		}
	}
	return dp[m][n];
}

function handleSearchInput() {
	const rawSearch = $(this).val();
	const searchWords = normalizeText(rawSearch).split(/\s+/).map(w => w.replace(/[^a-z0-9]/gi, ''));
	const maxDistance = 2;

	$('.imageContainer').each(function () {
		const promptText = normalizeText($(this).data('prompt') || '');
		const promptWords = promptText.split(/\s+/).map(w => w.replace(/[^a-z0-9]/gi, ''));

		const matched = searchWords.every(searchWord =>
			promptWords.some(promptWord =>
				promptWord.includes(searchWord) || levenshteinDistance(promptWord, searchWord) <= maxDistance
			)
		);

		$(this).toggle(matched);
	});
}
