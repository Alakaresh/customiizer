const userId = currentUser.ID;
const imagesPerLoad = 20;

// In the WordPress environment jQuery operates in no-conflict mode, so
// the global `$` alias is not defined. Define it here to reuse jQuery
// across helper functions declared outside the ready callback.
const $ = jQuery;

let allImages = [];
let filteredImages = [];
let offset = 0;
let isLoading = false;
let currentSort = 'explore';
let currentSearch = '';

jQuery(document).ready(function ($) {
        fetchImagesFromAPI();

        $('#sort-explore').on('click', function () {
                $(this).addClass('active');
                $('#sort-likes').removeClass('active');
                currentSort = 'explore';
                fetchImagesFromAPI(true);
        });

        $('#sort-likes').on('click', function () {
                $(this).addClass('active');
                $('#sort-explore').removeClass('active');
                currentSort = 'likes';
                fetchImagesFromAPI(true);
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

	$(window).on('scroll', function () {
		const nearBottom = $(window).scrollTop() + $(window).height() > $(document).height() - 200;
		if (nearBottom && !isLoading) {
			fetchImagesFromAPI();
		}
	});
});

// --- Fonctions principales ---

function fetchImagesFromAPI(reset = false) {
        if (isLoading) return Promise.resolve([]);
        if (reset) {
                offset = 0;
                allImages = [];
        }
        isLoading = true;
        $('#scroll-message').show();

        const params = new URLSearchParams({
                user_id: userId,
                limit: imagesPerLoad,
                offset: offset
        });
        if (currentSort === 'likes') {
                params.append('sort', 'likes');
        }
        if (currentSearch.trim() !== '') {
                params.append('search', currentSearch.trim());
        }

        const url = `${baseUrl}/wp-json/api/v1/images/load?${params.toString()}`;

        return fetch(url)
.then(res => res.json())
.then(data => {
if (data.success) {
offset += data.images.length;
        allImages = allImages.concat(data.images);
        applySortAndSearch();
return data.images;
} else {
console.error('[AJAX] ❌ Aucune image trouvée.');
return [];
}
})
.catch(error => {
console.error('[AJAX] ❌ Erreur de récupération des images:', error);
return [];
})
.finally(() => {
isLoading = false;
$('#scroll-message').hide();
});
}

function applySortAndSearch() {
        let images = [...allImages];
        if (currentSort === 'explore') {
                shuffleArray(images);
        }
        displayImages(images);
}

function filterImagesBySearch(images, searchValue) {
        const searchWords = normalizeText(searchValue).split(/\s+/).map(w => w.replace(/[^a-z0-9]/gi, ''));
        const maxDistance = 2;

        return images.filter(img => {
                const prompt = typeof img.prompt === 'object' ? JSON.stringify(img.prompt) : (img.prompt || '');
                const promptText = normalizeText(prompt);
                const promptWords = promptText.split(/\s+/).map(w => w.replace(/[^a-z0-9]/gi, ''));

                return searchWords.every(searchWord =>
                        promptWords.some(promptWord =>
                                promptWord.includes(searchWord) || levenshteinDistance(promptWord, searchWord) <= maxDistance
                        )
                );
        });
}

function displayImages(images) {
	const userFilter = getQueryParam('user');
	filteredImages = userFilter ? images.filter(i => i.display_name === userFilter) : images;

        const columns = initializeColumns();
        const container = $('<div/>', { class: 'image-container' });
        columns.forEach(c => container.append(c));
        $('#image-container').empty().append(container);

        filteredImages.forEach((img, idx) => {
                appendImage(img, columns, idx % columns.length);
        });

        enableImageEnlargement();
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
        currentSearch = $(this).val();
        fetchImagesFromAPI(true);
}
