/**
 * Bibliothèque de fichiers pour Customiizer
 * Gère deux dossiers ("site" et "user"), le tri, la recherche et le mode d'affichage.
 * Ce script dépend de jQuery et de CanvasManager (pour l'ajout d'image).
 */
(function ($) {
    // État interne
    let currentFolder = 'site';    // 'site' (images du site) ou 'user' (images importées)
    let currentSort   = 'name';    // 'name' ou 'date'
    let importedFiles = [];        // Images importées par l'utilisateur
    let generatedImages = [];      // Images générées ou du site

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
            $('#folder-selector button').removeClass('active');
            $(this).addClass('active');
            renderFileList();
        });
        $('#folder-user').on('click', function () {
            currentFolder = 'user';
            $('#folder-selector button').removeClass('active');
            $(this).addClass('active');
            renderFileList();
        });
        $('#sort-select').on('change', function () {
            currentSort = $(this).val();
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
            const searchValue = $(this).val().toLowerCase();
            $('#fileList .file-item').each(function () {
                const fileName = $(this).find('.file-name').text().toLowerCase();
                $(this).toggle(fileName.includes(searchValue));
            });
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
     * Affiche la liste en fonction du dossier actif, du tri et du type de vue.
     */
    function renderFileList() {
        const container = $('#fileList');
        container.empty();
        // Sélection du jeu d'images
        const images = currentFolder === 'site' ? generatedImages : importedFiles;
        if (!Array.isArray(images)) return;

        // Tri
        const sorted = images.slice().sort((a, b) => {
            if (currentSort === 'name') {
                return (a.name || '').localeCompare(b.name || '');
            }
            if (currentSort === 'date') {
                return new Date(b.date_created || 0) - new Date(a.date_created || 0);
            }
            return 0;
        });

        // Rendu
        sorted.forEach(img => {
            const name = img.name || img.url.split('/').pop();
            const url  = img.url;
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
    }

    // Expose l’API de la bibliothèque au niveau global pour interaction avec d’autres scripts
    window.FileLibrary = {
        init: init,
        setImportedFiles: setImportedFiles,
        setGeneratedImages: setGeneratedImages,
        render: renderFileList
    };
})(jQuery);
