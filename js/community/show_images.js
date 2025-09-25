const userId = currentUser.ID;
const imagesPerLoad = 30; // Increased to load more images per batch

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
let searchTimeout;
let resizeTimeout;
let currentColumnCount = determineColumnCount();
let columnHeights = [];

jQuery(document).ready(function ($) {
        fetchImagesFromAPI(true);

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

        $(document).on('input', '#search-input', debouncedHandleSearchInput);

        $(document).on('keypress', '#search-input', function (e) {
                if (e.which === 13) {
                        handleSearchInput.call(this);
                }
        });

        $(document).on('click', '#search-button', function () {
                handleSearchInput.call($('#search-input')[0]);
        });

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

        const loadMoreTrigger = document.getElementById('load-more-trigger');

        if (loadMoreTrigger && 'IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries) => {
                        if (entries[0].isIntersecting && !isLoading) {
                                fetchImagesFromAPI();
                        }
                }, { rootMargin: '200px' });
                observer.observe(loadMoreTrigger);
        } else {
                $(window).on('scroll', function () {
                        const atBottom = $(window).scrollTop() + $(window).height() >= $(document).height() - 200;
                        if (atBottom && !isLoading) {
                                fetchImagesFromAPI();
                        }
                });
        }

        $(window).on('resize', handleResizeColumns);
});

// --- Fonctions principales ---

function fetchImagesFromAPI(reset = false) {
        if (isLoading) return Promise.resolve([]);
        if (reset) {
                offset = 0;
                allImages = [];
        }
        isLoading = true;
        if (offset > 0) {
                $('#scroll-message').show();
        }

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

                                if (reset) {
                                        allImages = data.images;
                                        applySortAndSearch();
                                } else {
                                        shuffleArray(data.images);
                                        allImages = allImages.concat(data.images);
                                        appendImages(data.images);
                                }
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

        filteredImages.forEach((img) => {
                appendImage(img, columns);
        });

        enableImageEnlargement();
}

function appendImages(images) {
        const userFilter = getQueryParam('user');
        const container = $('#image-container .image-container');
        let columns = container.find('.image-column').toArray().map(el => $(el));

        if (columns.length === 0) {
                displayImages(allImages);
                return;
        }

        const filteredNew = userFilter ? images.filter(i => i.display_name === userFilter) : images;
        filteredImages = filteredImages.concat(filteredNew);

        syncColumnHeights(columns);

        filteredNew.forEach((img) => {
                appendImage(img, columns);
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
                title: 'J’aime'
	}).toggleClass('disabled', !userId);

	const starIcon = $('<i/>', {
		class: image.favorited_by_user ? 'fas fa-star star-icon favorited' : 'far fa-star star-icon',
		title: 'Favori'
	}).toggleClass('disabled', !userId);

        const img = $('<img/>', {
                alt: 'Image générée',
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

        let appended = false;

        const placeImageInColumn = () => {
                if (appended) {
                        return;
                }
                appended = true;

                const targetIndex = (typeof columnIndex === 'number' && columns[columnIndex])
                        ? columnIndex
                        : getShortestColumnIndex(columns);

                columns[targetIndex].append(imageDiv);
                updateColumnHeight(columns, targetIndex);
        };

        img.on('load', placeImageInColumn);
        img.on('error', placeImageInColumn);
        img.attr('src', imageUrl);

        if (img[0].complete) {
                placeImageInColumn();
        }
}

// --- Utilitaires ---

function initializeColumns() {
        currentColumnCount = determineColumnCount();
        columnHeights = new Array(currentColumnCount).fill(0);
        return createColumns(currentColumnCount);
}

function createColumns(count) {
        const columns = [];
        for (let i = 0; i < count; i++) {
                columns.push($('<div/>', { class: 'image-column' }));
        }
        return columns;
}

function determineColumnCount() {
        const width = window.innerWidth;
        const breakpoints = [
                { minWidth: 1800, columns: 6 },
                { minWidth: 1500, columns: 5 },
                { minWidth: 1200, columns: 4 },
                { minWidth: 900, columns: 3 },
                { minWidth: 640, columns: 2 }
        ];

        for (const { minWidth, columns } of breakpoints) {
                if (width >= minWidth) {
                        return columns;
                }
        }

        return 1;
}

function handleResizeColumns() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
                const newCount = determineColumnCount();
                if (newCount === currentColumnCount) {
                        return;
                }

                currentColumnCount = newCount;
                const container = $('#image-container .image-container');
                if (!container.length) {
                        return;
                }

                const columns = createColumns(newCount);
                container.empty();
                columns.forEach(column => container.append(column));

                columnHeights = new Array(newCount).fill(0);

                filteredImages.forEach((img) => {
                        appendImage(img, columns);
                });

                enableImageEnlargement();
        }, 150);
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

function syncColumnHeights(columns) {
        if (!Array.isArray(columns) || !columns.length) {
                return;
        }
        columnHeights = columns.map(col => col.outerHeight());
}

function getShortestColumnIndex(columns) {
        if (!Array.isArray(columns) || columns.length === 0) {
                return 0;
        }

        if (columnHeights.length !== columns.length) {
                columnHeights = columns.map((col, idx) => columnHeights[idx] || col.outerHeight());
        }

        let minIndex = 0;
        let minHeight = columnHeights[0] || 0;

        for (let i = 1; i < columnHeights.length; i++) {
                const height = columnHeights[i] || 0;
                if (height < minHeight) {
                        minHeight = height;
                        minIndex = i;
                }
        }

        return minIndex;
}

function updateColumnHeight(columns, index) {
        if (!Array.isArray(columns) || !columns[index]) {
                return;
        }

        columnHeights[index] = columns[index].outerHeight();
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

function debouncedHandleSearchInput() {
        const context = this;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function () {
                handleSearchInput.call(context);
        }, 300);
}
