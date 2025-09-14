/**
 * Bibliothèque de fichiers pour Customiizer
 * Gère trois dossiers ("my", "community" et "imported"), le tri et la recherche.
 * Ce script dépend de jQuery et de CanvasManager (pour l'ajout d'image).
 */
(function ($) {
    // État interne
    let currentFolder = 'my';      // 'my' (mes images), 'community' ou 'imported'
    let currentSort   = 'date';    // 'name' ou 'date'
    let importedFiles = [];        // Images importées par l'utilisateur
    let myImages = [];             // Images générées par l'utilisateur
    let communityImages = [];      // Images de la communauté
    let currentPage   = 1;         // Page courante
    let currentFormatFilter = 'all'; // 'all' ou 'format'
    const itemsPerPage = 40;       // Nombre d'images par page

    /**
     * Initialise la bibliothèque avec les images existantes.
     * @param {Object} options 
     *        options.my (Array)        : mes images générées
     *        options.community (Array) : images de la communauté
     *        options.imported (Array)  : images importées par l'utilisateur
     */
    function init(options) {
        myImages        = options?.my || [];
        communityImages = options?.community || [];
        importedFiles   = options?.imported || [];
        // Écouteurs d'événements
        $('#folder-my').on('click', function () {
            currentFolder = 'my';
            currentPage = 1;
            $('#folder-selector button').removeClass('active');
            $(this).addClass('active');
            renderFileList();
        });
        $('#folder-community').on('click', function () {
            currentFolder = 'community';
            currentPage = 1;
            $('#folder-selector button').removeClass('active');
            $(this).addClass('active');
            renderFileList();
        });
        $('#folder-imported').on('click', function () {
            currentFolder = 'imported';
            currentPage = 1;
            $('#folder-selector button').removeClass('active');
            $(this).addClass('active');
            renderFileList();
        });
        $('#sort-select').on('change', function () {
            currentSort = $(this).val();
            currentPage = 1;
            renderFileList();
        });
        $('#searchInput').on('input', function () {
            currentPage = 1;
            renderFileList();
        });
        $('#filter-all').on('click', function () {
            currentFormatFilter = 'all';
            currentPage = 1;
            $('.filter-buttons button').removeClass('active');
            $(this).addClass('active');
            renderFileList();
        });
        $('#filter-format').on('click', function () {
            currentFormatFilter = 'format';
            currentPage = 1;
            $('.filter-buttons button').removeClass('active');
            $(this).addClass('active');
            renderFileList();
        });

        // Zone de dépôt et chargement de fichiers
        const dropZone = $('#fileDropZone');
        const fileInput = $('#fileInput');

        function handleFiles(files) {
            let added = false;
            files.forEach(file => {
                if (!file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = function (ev) {
                    importedFiles.push({ name: file.name, url: ev.target.result });
                    if (currentFolder === 'imported') {
                        renderFileList();
                    }
                };
                reader.readAsDataURL(file);
                added = true;
            });

            if (added && currentFolder !== 'imported') {
                currentFolder = 'imported';
                currentPage = 1;
                $('#folder-selector button').removeClass('active');
                $('#folder-imported').addClass('active');
                renderFileList();
            }
        }

        dropZone.on('dragover', function (e) {
            e.preventDefault();
            dropZone.addClass('drag-over');
        });

        dropZone.on('dragleave', function () {
            dropZone.removeClass('drag-over');
        });

        dropZone.on('drop', function (e) {
            e.preventDefault();
            dropZone.removeClass('drag-over');
            const files = Array.from(e.originalEvent.dataTransfer.files || []);
            handleFiles(files);
        });

        dropZone.on('click', function (e) {
            if (e.target === fileInput[0]) return;
            fileInput.trigger('click');
        });

        fileInput.on('change', function (e) {
            const files = Array.from(e.target.files || []);
            handleFiles(files);
            fileInput.val('');
        });

        // Affichage initial
        renderFileList();
    }

    /**
     * Met à jour la liste des images importées.
     * @param {Array} files 
     */
    function setImportedFiles(files) {
        importedFiles = files || [];
        if (currentFolder === 'imported') {
            renderFileList();
        }
    }

    /**
     * Met à jour la liste de mes images.
     * @param {Array} files
     */
    function setMyImages(files) {
        myImages = files || [];
        if (currentFolder === 'my') {
            renderFileList();
        }
    }

    /**
     * Met à jour la liste des images de la communauté.
     * @param {Array} files
     */
    function setCommunityImages(files) {
        communityImages = files || [];
        if (currentFolder === 'community') {
            renderFileList();
        }
    }

    async function deleteImportedImage(imageUrl) {
        if (imageUrl.startsWith('data:')) {
            importedFiles = importedFiles.filter(img => (img.url || img.image_url) !== imageUrl);
            renderFileList();
            return;
        }
        try {
            const response = await fetch('/wp-json/customiizer/v1/delete-image/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_url: imageUrl, user_id: currentUser.ID })
            });
            const result = await response.json();
            if (result.success) {
                importedFiles = importedFiles.filter(img => (img.url || img.image_url) !== imageUrl);
                renderFileList();
            } else {
                alert('Erreur lors de la suppression.');
            }
        } catch (error) {
            console.error('[Delete] Erreur serveur :', error);
            alert('Erreur lors de la suppression.');
        }
    }

    /**
     * Affiche les contrôles de pagination.
     * @param {number} totalPages
     */
    function renderPagination(totalPages) {
        const controls = $('#paginationControls');
        controls.empty();
        if (totalPages <= 1) {
            controls.hide();
            return;
        }
        controls.show();

        const prev = $('<button class="page-prev">Précédent</button>');
        const next = $('<button class="page-next">Suivant</button>');
        const input = $(`<input type="number" class="page-input" min="1" max="${totalPages}" value="${currentPage}">`);
        const total = $(`<span class="page-total">/ ${totalPages}</span>`);

        prev.prop('disabled', currentPage === 1);
        next.prop('disabled', currentPage === totalPages);

        prev.on('click', function () {
            if (currentPage > 1) {
                currentPage--;
                renderFileList();
            }
        });

        next.on('click', function () {
            if (currentPage < totalPages) {
                currentPage++;
                renderFileList();
            }
        });

        input.on('change keydown', function (e) {
            if (e.type === 'change' || e.key === 'Enter') {
                let page = parseInt($(this).val(), 10);
                if (isNaN(page)) return;
                page = Math.max(1, Math.min(totalPages, page));
                if (page !== currentPage) {
                    currentPage = page;
                    renderFileList();
                }
            }
        });

        controls.append(prev, input, total, next);
    }

    /**
     * Affiche la liste en fonction du dossier actif, du tri et du type de vue.
     */
    function renderFileList() {
        const container = $('#fileList');
        container.empty();
        // Sélection du jeu d'images
        let images;
        switch (currentFolder) {
            case 'my':
                images = myImages;
                break;
            case 'community':
                images = communityImages;
                break;
            default:
                images = importedFiles;
        }
        if (!Array.isArray(images)) return;

        const searchValue = $('#searchInput').val().toLowerCase();

        const formatFilter = currentFormatFilter === 'format'
            ? window.selectedVariant?.ratio_image
            : null;

        // Filtrage par recherche et format
        const filtered = images.filter(img => {
            if (formatFilter && img.format !== formatFilter) return false;
            const rawUrl = img.url || img.image_url || '';
            const name = img.name || img.image_prefix || rawUrl.split('/').pop();
            return name.toLowerCase().includes(searchValue);
        });

        // Tri des résultats filtrés
        const sorted = filtered.slice().sort((a, b) => {
            const aName = a.name || a.image_prefix || (a.url || a.image_url || '').split('/').pop();
            const bName = b.name || b.image_prefix || (b.url || b.image_url || '').split('/').pop();

            if (currentSort === 'name') {
                return aName.localeCompare(bName);
            }
            if (currentSort === 'date') {
                const aDate = a.date_created || a.image_date || a.date || 0;
                const bDate = b.date_created || b.image_date || b.date || 0;
                return new Date(bDate) - new Date(aDate);
            }
            return 0;
        });

        const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * itemsPerPage;
        const pageItems = sorted.slice(start, start + itemsPerPage);

        // Rendu
        pageItems.forEach(img => {
            const rawUrl = img.url || img.image_url;
            let url = rawUrl;
            if (rawUrl && typeof rawUrl === 'object') {
                url = rawUrl.url || rawUrl.src || rawUrl.path || '';
            }
            if (!url || typeof url !== 'string') return; // Ignore entries without valid URL
            const name = img.name || img.image_prefix || url.split('/').pop();

            const menu = currentFolder === 'imported'
                ? `<button type="button" class="file-menu-button"><i class="fas fa-ellipsis-v"></i></button>
                   <div class="file-menu-dropdown"><button class="file-delete">Supprimer</button></div>`
                : '';
            const item = $(
                `<div class="file-item">
                    ${menu}
                    <img src="${url}" alt="${name}" class="preview-enlarge">
                    <i class="fas fa-search-plus preview-icon"></i>
                    <button type="button" class="apply-button">Appliquez</button>
                    <span class="file-name">${name}</span>
                </div>`
            );

            const imgElement = item.find('img.preview-enlarge');
            imgElement.attr({
                'data-display_name': img.display_name || '',
                'data-user-id': img.user_id || '',
                'data-format-image': img.format || '',
                'data-prompt': (typeof img.prompt === 'object'
                    ? (img.prompt.text || img.prompt.prompt || JSON.stringify(img.prompt))
                    : (img.prompt || ''))
            });
            item.find('.preview-icon').on('click', function (e) {
                e.stopPropagation();
                const imgEl = item.find('img.preview-enlarge')[0];
                if (imgEl) {
                    imgEl.click();
                }
            });
            item.find('.apply-button').on('click', function (e) {
                e.stopPropagation();
                // Ajoute l'image au canvas (fonction existante)
                CanvasManager.addImage(url, function () {
                    if (typeof updateAddImageButtonVisibility === 'function') {
                        updateAddImageButtonVisibility();
                    }
                });
                $('#imageSourceModal').hide();
                releaseFocus($('#imageSourceModal'));
            });
            if (currentFolder === 'imported') {
                const menuBtn = item.find('.file-menu-button');
                const dropdown = item.find('.file-menu-dropdown');
                menuBtn.on('click', function (e) {
                    e.stopPropagation();
                    dropdown.toggle();
                });
                item.on('mouseleave', function () {
                    dropdown.hide();
                });
                dropdown.find('.file-delete').on('click', function (e) {
                    e.stopPropagation();
                    deleteImportedImage(url);
                });
            }
            container.append(item);
        });

        renderPagination(totalPages);

        // Assure que le zoom via l'icône déclenche bien la prévisualisation agrandie
        if (typeof enableImageEnlargement === 'function') {
            enableImageEnlargement();
        }
    }

    // Expose l’API de la bibliothèque au niveau global pour interaction avec d’autres scripts
    window.FileLibrary = {
        init: init,
        setImportedFiles: setImportedFiles,
        setMyImages: setMyImages,
        setCommunityImages: setCommunityImages,
        render: renderFileList
    };
})(jQuery);
