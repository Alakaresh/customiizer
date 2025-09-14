/**
 * Bibliothèque de fichiers pour Customiizer
 * Gère deux dossiers ("site" et "user"), le tri, la recherche et le mode d'affichage.
 * Ce script dépend de jQuery et de CanvasManager (pour l'ajout d'image).
 */
(function ($) {
    // État interne
    let currentFolder = 'site';    // 'site' (images du site) ou 'user' (images importées)
    let currentSort   = 'date';    // 'name' ou 'date'
    let importedFiles = [];        // Images importées par l'utilisateur
    let generatedImages = [];      // Images générées ou du site
    let currentPage   = 1;         // Page courante
    const itemsPerPage = 20;       // Nombre d'images par page

    /**
     * Initialise la bibliothèque avec les images existantes.
     * @param {Object} options 
     *        options.generated (Array) : images générées du site
     *        options.imported (Array) : images importées par l'utilisateur
     */
    function init(options) {
        generatedImages = options?.generated || [];
        importedFiles   = options?.imported || [];
        // Écouteurs d'événements
        $('#folder-site').on('click', function () {
            currentFolder = 'site';
            currentPage = 1;
            $('#folder-selector button').removeClass('active');
            $(this).addClass('active');
            renderFileList();
        });
        $('#folder-user').on('click', function () {
            currentFolder = 'user';
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
        $('#view-grid').on('click', function () {
            $('#fileList').removeClass('list-view').addClass('grid-view');
            $('#view-toggle button').removeClass('active');
            $(this).addClass('active');
        });
        $('#view-list').on('click', function () {
            $('#fileList').removeClass('grid-view').addClass('list-view');
            $('#view-toggle button').removeClass('active');
            $(this).addClass('active');
        });
        $('#searchInput').on('input', function () {
            currentPage = 1;
            renderFileList();
        });

        // Zone de dépôt et chargement de fichiers
        const dropZone = $('#fileDropZone');
        const fileInput = $('#fileInput');

        function handleFiles(files) {
            files.forEach(file => {
                if (!file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = function (ev) {
                    importedFiles.push({ name: file.name, url: ev.target.result });
                    if (currentFolder === 'user') {
                        renderFileList();
                    }
                };
                reader.readAsDataURL(file);
            });
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
        if (currentFolder === 'user') {
            renderFileList();
        }
    }

    /**
     * Met à jour la liste des images générées (site).
     * @param {Array} files 
     */
    function setGeneratedImages(files) {
        generatedImages = files || [];
        if (currentFolder === 'site') {
            renderFileList();
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
        const info = $(`<span class="page-info">${currentPage} / ${totalPages}</span>`);

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

        controls.append(prev, info, next);
    }

    /**
     * Affiche la liste en fonction du dossier actif, du tri et du type de vue.
     */
    function renderFileList() {
        const container = $('#fileList');
        container.empty();
        // Sélection du jeu d'images
        const images = currentFolder === 'site' ? generatedImages : importedFiles;
        if (!Array.isArray(images)) return;

        const searchValue = $('#searchInput').val().toLowerCase();

        // Tri
        const sorted = images.slice().sort((a, b) => {

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

        // Filtrage par recherche
        const filtered = sorted.filter(img => {
            const rawUrl = img.url || img.image_url || '';
            const name = img.name || img.image_prefix || rawUrl.split('/').pop();
            return name.toLowerCase().includes(searchValue);
        });

        const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * itemsPerPage;
        const pageItems = filtered.slice(start, start + itemsPerPage);

        // Rendu
        pageItems.forEach(img => {
            const rawUrl = img.url || img.image_url;
            let url = rawUrl;
            if (rawUrl && typeof rawUrl === 'object') {
                url = rawUrl.url || rawUrl.src || rawUrl.path || '';
            }
            if (!url || typeof url !== 'string') return; // Ignore entries without valid URL
            const name = img.name || img.image_prefix || url.split('/').pop();

            const item = $(
                `<div class="file-item">
                    <img src="${url}" alt="${name}" class="image-thumbnail">
                    <span class="file-name">${name}</span>
                </div>`
            );
            item.on('click', function () {
                // Ajoute l'image au canvas (fonction existante)
                CanvasManager.addImage(url, function () {
                    if (typeof updateAddImageButtonVisibility === 'function') {
                        updateAddImageButtonVisibility();
                    }
                });
                $('#imageSourceModal').hide();
                releaseFocus($('#imageSourceModal'));
            });
            container.append(item);
        });

        renderPagination(totalPages);
    }

    // Expose l’API de la bibliothèque au niveau global pour interaction avec d’autres scripts
    window.FileLibrary = {
        init: init,
        setImportedFiles: setImportedFiles,
        setGeneratedImages: setGeneratedImages,
        render: renderFileList
    };
})(jQuery);
