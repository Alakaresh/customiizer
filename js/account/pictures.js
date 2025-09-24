var ImageLoader = (function() {
        const IMAGES_PER_BATCH = 16;
        const GRID_SELECTOR = '#account-images-grid';
        const EMPTY_SELECTOR = '#account-images-empty';
        const EMPTY_MESSAGE_SELECTOR = '#account-images-empty-text';
        const PAGINATION_SELECTOR = '#account-images-pagination';

        let currentPage = 1;
        let allImages = [];

        function loadUserGeneratedImages() {
                const uid = window.currentUser && currentUser.ID ? currentUser.ID : 0;
                if (!uid) {
                        console.warn('⚠️ Aucun utilisateur connecté, impossible de charger les images.');
                        showEmptyState('Aucune image à afficher pour le moment.');
                        return;
                }

                const cacheKey = 'userGeneratedImages_' + uid;
                const storedImages = sessionStorage.getItem(cacheKey);

                if (storedImages) {
                        try {
                                allImages = JSON.parse(storedImages) || [];
                        } catch (error) {
                                console.warn('⚠️ Impossible d\'analyser le cache des images utilisateur :', error);
                                allImages = [];
                                sessionStorage.removeItem(cacheKey);
                        }
                        currentPage = 1;
                        renderImages();
                        enableImageEnlargement();
                        return;
                }

                const apiUrl = `/wp-json/api/v1/images/load/${uid}?limit=1000`;

                fetch(apiUrl)
                        .then(response => response.json())
                        .then(data => {
                                if (data.success && Array.isArray(data.images)) {
                                        allImages = data.images;
                                        sessionStorage.setItem(cacheKey, JSON.stringify(allImages));
                                        currentPage = 1;
                                        renderImages();
                                        enableImageEnlargement();
                                } else {
                                        console.error('Invalid response format or no images found:', data);
                                        showEmptyState('Aucune image trouvée.');
                                }
                        })
                        .catch(error => {
                                console.error('❌ Erreur AJAX:', error);
                                showEmptyState('Erreur lors de la récupération des images.');
                        });
        }

        function triggerImageSelection(imgElement) {
                if (!imgElement) return;

                if (typeof handleImageClick === 'function') {
                        handleImageClick({ target: imgElement });
                } else {
                        imgElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }
        }

        function showEmptyState(message) {
                const grid = jQuery(GRID_SELECTOR);
                const pagination = jQuery(PAGINATION_SELECTOR);
                const emptyState = jQuery(EMPTY_SELECTOR);
                const emptyMessage = jQuery(EMPTY_MESSAGE_SELECTOR);

                if (grid.length) {
                        grid.empty();
                }

                if (pagination.length) {
                        pagination.empty().attr('hidden', true);
                }

                if (emptyMessage.length && message) {
                        emptyMessage.text(message);
                }

                if (emptyState.length) {
                        emptyState.prop('hidden', false);
                } else {
                        jQuery('#image-container').html('<p>' + (message || 'Aucune image trouvée.') + '</p>');
                }
        }

        function hideEmptyState() {
                const emptyState = jQuery(EMPTY_SELECTOR);
                if (emptyState.length) {
                        emptyState.prop('hidden', true);
                }
        }

        function createFileItem(image) {
                if (!image || !image.image_url) {
                        return null;
                }

                const item = jQuery('<article/>', {
                        class: 'file-item',
                        role: 'listitem'
                });

                const img = jQuery('<img/>', {
                        src: image.image_url,
                        alt: image.alt || 'Image générée',
                        class: 'preview-enlarge',
                        loading: 'lazy'
                });

                const promptData = typeof image.prompt === 'object'
                        ? (image.prompt.text || image.prompt.prompt || JSON.stringify(image.prompt))
                        : (image.prompt || '');

                img.attr({
                        'data-display_name': image.display_name || '',
                        'data-user-logo': image.user_logo || '',
                        'data-user-id': image.user_id || '',
                        'data-format-image': image.format || '',
                        'data-prompt': promptData
                });

                const previewButton = jQuery('<button/>', {
                        type: 'button',
                        class: 'preview-icon',
                        'aria-label': 'Agrandir l’image'
                }).append(jQuery('<i/>', { class: 'fas fa-search-plus', 'aria-hidden': 'true' }));

                const chooseButton = jQuery('<button/>', {
                        type: 'button',
                        class: 'apply-button',
                        text: 'Choisir'
                });

                previewButton.on('click', function(event) {
                        event.preventDefault();
                        event.stopPropagation();
                        triggerImageSelection(img[0]);
                });

                chooseButton.on('click', function(event) {
                        event.preventDefault();
                        event.stopPropagation();
                        triggerImageSelection(img[0]);
                });

                item.on('click', function(event) {
                        if (jQuery(event.target).closest('button').length) {
                                return;
                        }
                        triggerImageSelection(img[0]);
                });

                item.append(img, previewButton, chooseButton);
                return item;
        }

        function renderImages() {
                const grid = jQuery(GRID_SELECTOR);

                if (!grid.length) {
                        console.error('❌ Impossible de trouver le conteneur des images.');
                        return;
                }

                if (!Array.isArray(allImages) || allImages.length === 0) {
                        showEmptyState('Aucune image disponible pour le moment.');
                        return;
                }

                hideEmptyState();

                const totalPages = Math.max(1, Math.ceil(allImages.length / IMAGES_PER_BATCH));

                if (currentPage > totalPages) {
                        currentPage = totalPages;
                }

                if (currentPage < 1) {
                        currentPage = 1;
                }

                const startIndex = (currentPage - 1) * IMAGES_PER_BATCH;
                const imagesToRender = allImages.slice(startIndex, startIndex + IMAGES_PER_BATCH);

                grid.empty();

                const fragment = document.createDocumentFragment();
                imagesToRender.forEach(function(image) {
                        const item = createFileItem(image);
                        if (item) {
                                fragment.appendChild(item.get(0));
                        }
                });

                grid.append(fragment);
                renderPagination(totalPages);
        }

        function renderPagination(totalPages) {
                const pagination = jQuery(PAGINATION_SELECTOR);

                if (!pagination.length) {
                        return;
                }

                pagination.empty();

                if (totalPages <= 1) {
                        pagination.attr('hidden', true);
                        return;
                }

                pagination.attr('hidden', false);

                const prevButton = jQuery('<button/>', {
                        type: 'button',
                        text: 'Précédent',
                        class: 'pagination-button prev',
                        'aria-label': 'Page précédente'
                }).prop('disabled', currentPage === 1);

                const nextButton = jQuery('<button/>', {
                        type: 'button',
                        text: 'Suivant',
                        class: 'pagination-button next',
                        'aria-label': 'Page suivante'
                }).prop('disabled', currentPage === totalPages);

                prevButton.on('click', function() {
                        if (currentPage > 1) {
                                currentPage--;
                                renderImages();
                        }
                });

                nextButton.on('click', function() {
                        if (currentPage < totalPages) {
                                currentPage++;
                                renderImages();
                        }
                });

                const pageInfo = jQuery('<span/>', {
                        class: 'page-info',
                        text: 'Page ' + currentPage + ' sur ' + totalPages
                });

                pagination.append(prevButton, pageInfo, nextButton);
        }

        return {
                loadUserGeneratedImages: loadUserGeneratedImages
        };
})();

jQuery(document).ready(function($) {
        ImageLoader.loadUserGeneratedImages();
});
