/**
 * Bibliothèque de fichiers pour Customiizer
 * Gère trois dossiers ("my", "community" et "imported"), le tri et la recherche.
 * Ce script dépend de jQuery et de CanvasManager (pour l'ajout d'image).
 */
(function ($) {
    if (typeof baseUrl === 'undefined') {
        var baseUrl = window.location.origin;
    }
    // État interne
    let currentFolder = 'my';      // 'my' (mes images), 'community' ou 'imported'
    let currentSort   = 'date';    // 'name' ou 'date'
    let importedFiles = [];        // Images importées par l'utilisateur
    let myImages = [];             // Images générées par l'utilisateur
    let communityImages = [];      // Images de la communauté
    let currentPage   = 1;         // Page courante
    let currentFormatFilter = 'all'; // 'all' ou ratio sélectionné
    let currentProduct = null;       // ID du produit sélectionné
    let currentSize = null;          // Taille sélectionnée
    let productFormats = [];         // Ratios disponibles pour le produit
    let sizeRatioMap = {};           // Association taille -> ratio
    const itemsPerPage = 40;       // Nombre d'images par page
    let searchTimeout;             // Délai pour la recherche distante

    // Cache des variantes (taille/ratio) par produit
    let variantCache = {};
    try {
        variantCache = window.customizerCache?.variantBasics || {};
    } catch (e) {
        variantCache = {};
    }

    async function ensureVariantCache() {
        if (Object.keys(variantCache).length === 0) {
            try {
                const res = await fetch('/wp-json/api/v1/products/variants_all');
                const data = await res.json();
                const grouped = {};
                (data || []).forEach(v => {
                    if (!grouped[v.product_id]) grouped[v.product_id] = [];
                    grouped[v.product_id].push({
                        variant_id: v.variant_id,
                        size: v.size,
                        ratio_image: v.ratio_image
                    });
                });
                variantCache = grouped;
                window.customizerCache = window.customizerCache || {};
                window.customizerCache.variantBasics = variantCache;
                try {
                    const tmp = { ...window.customizerCache, models: {} };
                    sessionStorage.setItem('customizerCache', JSON.stringify(tmp));
                } catch (e) {}
            } catch (err) {
                console.error('❌ preload variants', err);
            }
        }
    }
    ensureVariantCache();

    // -------- Cache format -> produits --------
    try {
        const saved = sessionStorage.getItem('previewFormatCache');
        window.previewFormatCache = {
            ...(saved ? JSON.parse(saved) : {}),
            ...(window.previewFormatCache || {})
        };
    } catch (e) {
        window.previewFormatCache = window.previewFormatCache || {};
    }

    function persistPreviewCache() {
        try {
            sessionStorage.setItem('previewFormatCache', JSON.stringify(window.previewFormatCache));
        } catch (e) {}
    }

    async function getProductNameForFormat(fmt) {
        const cached = window.previewFormatCache[fmt];
        if (cached) {
            return extractProductName(cached);
        }
        try {
            const res = await fetch(`/wp-json/api/v1/products/format?format=${encodeURIComponent(fmt)}`);
            const data = await res.json();
            window.previewFormatCache[fmt] = data;
            persistPreviewCache();
            return extractProductName(data);
        } catch (err) {
            console.error('❌ format fetch', fmt, err);
            return null;
        }
    }

    function extractProductName(data) {
        if (data && data.success && Array.isArray(data.choices)) {
            const ids = Array.from(new Set(data.choices.map(c => c.product_id)));
            if (ids.length === 1 && data.choices[0]) {
                return data.choices[0].product_name;
            }
        }
        return null;
    }

    /**
     * Met à jour le libellé du format sélectionné.
     * @param {string} fmt                 Ratio de l'image.
     * @param {boolean} [showProductName]  Affiche le nom du produit associé si true.
     * @param {string|null} productName    Nom du produit sélectionné.
     * @param {string|null} variantName    Nom de la variante sélectionnée.
     */
    function updateFormatLabel(fmt, showProductName = false, productName = null, variantName = null) {
        const btn = $('#open-format-menu');
        btn.addClass('active').text(`Format: ${fmt}`);
        if (showProductName) {
            const parts = [];
            if (productName) parts.push(productName);
            if (variantName) parts.push(variantName);
            if (parts.length > 0) {
                btn.addClass('active').text(`Format: ${parts.join(' – ')}`);
            } else {
                getProductNameForFormat(fmt).then(name => {
                    if (name) {
                        btn.addClass('active').text(`Format: ${name}`);
                    }
                });
            }
        }
    }

    async function fetchCommunityImages(searchValue) {
        const params = new URLSearchParams({ limit: 200, offset: 0 });
        if (searchValue) {
            params.append('search', searchValue);
        }
        try {
            const res = await fetch(`${baseUrl}/wp-json/api/v1/images/load?${params.toString()}`);
            const data = await res.json();
            communityImages = (data && data.success && Array.isArray(data.images)) ? data.images : [];
            renderFileList(true);
        } catch (err) {
            console.error('❌ community search', err);
        }
    }
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
        const sizeBlock = $('#size-block');
        const productRatioButton = $('#filter-product-ratio');

        function resolveVariant(variantCandidate) {
            if (variantCandidate && typeof variantCandidate === 'object') {
                return variantCandidate;
            }
            if (typeof selectedVariant !== 'undefined' && selectedVariant && typeof selectedVariant === 'object') {
                return selectedVariant;
            }
            if (window.selectedVariant && typeof window.selectedVariant === 'object') {
                return window.selectedVariant;
            }
            return null;
        }

        function applyProductRatioFilter(ratio, variantData) {
            if (!ratio) return;
            const variant = resolveVariant(variantData);
            const productName = (variant && variant.product_name)
                ? variant.product_name
                : ($('#customizeModalTitle').text() || '').trim() || null;
            const sizeName = variant?.size || null;

            currentFormatFilter = ratio;
            currentProduct = null;
            currentSize = null;
            productFormats = [];
            sizeRatioMap = {};

            $('#mainFormatFilters .format-main').removeClass('active');
            if (productRatioButton.length) {
                productRatioButton.addClass('active');
            }
            $('#formatOptions .format-btn').removeClass('active');
            $('#product-block').removeClass('active');
            $('#formatOptions').removeClass('active');
            sizeBlock.hide();
            $('#sizeButtons').empty();

            $('#open-format-menu').addClass('active');
            updateFormatLabel(ratio, !!(productName || sizeName), productName, sizeName);

            currentPage = 1;
            renderFileList();
        }

        function updateProductRatioButton(variantCandidate) {
            if (!productRatioButton.length) return;
            const variant = resolveVariant(variantCandidate);
            const ratio = variant?.ratio_image || null;
            const sizeName = variant?.size || null;
            const wasActive = productRatioButton.hasClass('active');

            if (ratio) {
                const labelParts = ['Produit'];
                if (sizeName) labelParts.push(sizeName);
                labelParts.push(ratio);
                productRatioButton
                    .prop('disabled', false)
                    .text(labelParts.join(' – '))
                    .data('ratio', ratio)
                    .data('variant-size', sizeName || '');

                if (wasActive && currentFormatFilter !== ratio) {
                    applyProductRatioFilter(ratio, variant);
                }
            } else {
                productRatioButton
                    .prop('disabled', true)
                    .removeClass('active')
                    .text('Produit')
                    .removeData('ratio')
                    .removeData('variant-size');

                if (wasActive && currentFormatFilter !== 'all') {
                    currentFormatFilter = 'all';
                    $('#open-format-menu').removeClass('active').text('Format');
                    currentPage = 1;
                    renderFileList();
                }
            }
        }
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
            const val = $(this).val();
            clearTimeout(searchTimeout);
            if (currentFolder === 'community') {
                searchTimeout = setTimeout(() => fetchCommunityImages(val), 300);
            } else {
                renderFileList();
            }
        });
        // Filtre principal "Tous"
        $('#filter-all').on('click', function () {
            currentFormatFilter = 'all';
            currentProduct = null;
            currentSize = null;
            productFormats = [];
            sizeRatioMap = {};
            $('#mainFormatFilters .format-main').removeClass('active');
            $(this).addClass('active');
            $('#formatOptions').removeClass('active');
            $('#formatOptions .format-btn').removeClass('active');
            $('#product-block').removeClass('active');
            sizeBlock.hide();
            $('#product-block button').removeClass('active');
            $('#sizeButtons').empty();
            $('#open-format-menu').removeClass('active').text('Format');
            currentPage = 1;
            renderFileList();
        });

        if (productRatioButton.length) {
            productRatioButton.on('click', function () {
                if ($(this).prop('disabled')) return;
                const storedRatio = $(this).data('ratio');
                const variant = resolveVariant();
                const ratio = variant?.ratio_image || storedRatio;
                if (!ratio) return;
                applyProductRatioFilter(ratio, variant);
            });
        }

        // Ouverture du menu format
        $('#open-format-menu').on('click', function (e) {
            e.stopPropagation();
            $('#formatOptions').toggleClass('active');
            $('#product-block').removeClass('active');
        });

        $(document).on('click', function (e) {
            if (!$(e.target).closest('#formatOptions, #open-format-menu').length) {
                $('#formatOptions').removeClass('active');
                $('#product-block').removeClass('active');
                sizeBlock.hide();
            }
        });

        // Sélection d'un format standard
        $('#formatOptions .format-btn').on('click', function () {
            const fmt = $(this).data('format');
            if (!fmt) return;
            currentFormatFilter = fmt;
            currentProduct = null;
            currentSize = null;
            productFormats = [];
            sizeRatioMap = {};
            $('#formatOptions .format-btn').removeClass('active');
            $('#product-block button').removeClass('active');
            $('#sizeButtons').empty();
            $(this).addClass('active');
            $('#mainFormatFilters .format-main').removeClass('active');
            $('#open-format-menu').addClass('active');
            $('#product-block').removeClass('active');
            sizeBlock.hide();
            currentPage = 1;
            renderFileList();
            updateFormatLabel(fmt);
            $('#formatOptions').removeClass('active');
        });

        $(document)
            .off('variantReady.fileLibrary')
            .on('variantReady.fileLibrary', function (event, variant) {
                updateProductRatioButton(variant);
            });

        updateProductRatioButton(resolveVariant());

        // Accès aux produits
        $('#format-product').on('click', function (e) {
            e.stopPropagation();
            $('#product-block').toggleClass('active');
        });

        // Chargement des produits
        fetch('/wp-json/api/v1/products/list')
            .then(res => res.json())
            .then(products => {
                const container = $('#product-block');
                container.empty();
                (products || []).forEach(p => {
                    const btn = $('<button type="button" class="product-btn"></button>').text(p.name);
                    btn.on('click', function () {
                        currentProduct = p.product_id;
                        currentSize = null;
                        currentFormatFilter = 'all';
                        $('.product-btn').removeClass('active');
                        $('#format-block .format-btn').removeClass('active');
                        $(this).addClass('active');
                        $('#mainFormatFilters .format-main').removeClass('active');
                        $('#open-format-menu').addClass('active').text('Format');

                        const handleVariants = (variants) => {
                            productFormats = [];
                            sizeRatioMap = {};
                            const sizes = [];
                            (variants || []).forEach(v => {
                                if (!sizes.includes(v.size)) sizes.push(v.size);
                                sizeRatioMap[v.size] = v.ratio_image;
                                if (!productFormats.includes(v.ratio_image)) productFormats.push(v.ratio_image);
                            });
                            const sizeContainer = $('#sizeButtons');
                            sizeContainer.empty();
                            sizes.forEach(sz => {
                                const sbtn = $('<button type="button" class="size-btn"></button>').text(sz);
                                sbtn.on('click', function () {
                                    currentSize = sz;
                                    currentFormatFilter = sizeRatioMap[sz] || 'all';
                                    $('.size-btn').removeClass('active');
                                    $(this).addClass('active');
                                    currentPage = 1;
                                    renderFileList();
                                    if (currentFormatFilter !== 'all') {
                                        updateFormatLabel(currentFormatFilter, true, p.name, sz);
                                    } else {
                                        $('#open-format-menu').text('Format');
                                    }
                                    $('#formatOptions').removeClass('active');
                                });
                                sizeContainer.append(sbtn);
                            });
                            sizeBlock.css('display', 'flex');
                            $('#sizeButtons button').removeClass('active');
                            currentPage = 1;
                            renderFileList();
                        };

                        const cached = variantCache[p.product_id];
                        if (cached) {
                            handleVariants(cached);
                        } else {
                            fetch(`/wp-json/api/v1/products/${p.product_id}/variants`)
                                .then(r => r.json())
                                .then(variants => {
                                    variantCache[p.product_id] = (variants || []).map(v => ({
                                        variant_id: v.variant_id,
                                        size: v.size,
                                        ratio_image: v.ratio_image
                                    }));
                                    try {
                                        window.customizerCache = window.customizerCache || {};
                                        window.customizerCache.variantBasics = variantCache;
                                        const tmp = { ...window.customizerCache, models: {} };
                                        sessionStorage.setItem('customizerCache', JSON.stringify(tmp));
                                    } catch (e) {}
                                    handleVariants(variantCache[p.product_id]);
                                })
                                .catch(err => {
                                    console.error('❌ load sizes', err);
                                    sizeBlock.hide();
                                });
                        }
                    });
                    container.append(btn);
                });
            })
            .catch(err => console.error('❌ load products', err));

        // Zone de dépôt et chargement de fichiers
        const dropZone = $('#fileDropZone');
        const fileInput = $('#fileInput');
        const dropzoneDefault = dropZone.find('.dropzone-default');
        const uploadFeedback = dropZone.find('.upload-feedback');
        const uploadFeedbackText = uploadFeedback.find('span');
        let isUploading = false;

        function activateImportedFolder() {
            if (currentFolder !== 'imported') {
                currentFolder = 'imported';
                currentPage = 1;
                $('#folder-selector button').removeClass('active');
                $('#folder-imported').addClass('active');
            }
            renderFileList();
        }

        function readFileAsDataURL(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });
        }

        async function uploadImageFromLibrary(fileData) {
            if (typeof window.uploadFileToServer === 'function') {
                return window.uploadFileToServer(fileData);
            }
            try {
                const response = await fetch('/wp-json/customiizer/v1/upload-image/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: fileData.url,
                        name: fileData.name,
                        size: fileData.size,
                        user_id: currentUser.ID
                    })
                });
                const result = await response.json();
                if (!result.success) {
                    throw new Error('Upload failed');
                }
                return true;
            } catch (error) {
                console.error('[Upload] Erreur serveur :', error);
                alert('Erreur lors du téléversement.');
                throw error;
            }
        }

        async function refreshImportedImages() {
            if (typeof window.fetchUserImages === 'function') {
                return window.fetchUserImages();
            }
            try {
                const response = await fetch(`/wp-json/customiizer/v1/user-images/?user_id=${currentUser.ID}`);
                const data = await response.json();
                if (Array.isArray(data)) {
                    setImportedFiles(data);
                }
            } catch (error) {
                console.error('[UserImages] Erreur API :', error);
            }
        }

        async function handleFiles(files) {
            const imageFiles = files.filter(file => file.type && file.type.startsWith('image/'));
            if (imageFiles.length === 0) {
                return;
            }

            if (isUploading) {
                return;
            }
            isUploading = true;

            dropZone.addClass('is-uploading').attr('aria-busy', 'true');
            dropzoneDefault.attr('aria-hidden', 'true');
            uploadFeedback.attr('aria-hidden', 'false');
            uploadFeedbackText.text(imageFiles.length > 1 ? 'Ajout des images…' : 'Ajout de l’image…');

            try {
                activateImportedFolder();

                let hasSuccess = false;

                for (const file of imageFiles) {
                    try {
                        const url = await readFileAsDataURL(file);
                        const uploadResult = await uploadImageFromLibrary({
                            name: file.name,
                            size: file.size,
                            url: url
                        });
                        if (uploadResult) {
                            hasSuccess = true;
                        }
                    } catch (error) {
                        // L'erreur est déjà gérée dans uploadImageFromLibrary (console + alert).
                    }
                }

                if (hasSuccess) {
                    await refreshImportedImages();
                }
            } finally {
                dropZone.removeClass('is-uploading').removeAttr('aria-busy');
                dropzoneDefault.attr('aria-hidden', 'false');
                uploadFeedback.attr('aria-hidden', 'true');
                isUploading = false;
            }
        }

        dropZone.on('dragover', function (e) {
            e.preventDefault();
            dropZone.addClass('drag-over');
        });

        dropZone.on('dragleave', function () {
            dropZone.removeClass('drag-over');
        });

        dropZone.on('drop', async function (e) {
            e.preventDefault();
            dropZone.removeClass('drag-over');
            const files = Array.from(e.originalEvent.dataTransfer.files || []);
            await handleFiles(files);
        });

        dropZone.on('click', function (e) {
            if (e.target === fileInput[0]) return;
            fileInput.trigger('click');
        });

        fileInput.on('change', async function (e) {
            const files = Array.from(e.target.files || []);
            await handleFiles(files);
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
    function renderFileList(skipSearch = false) {
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

        const searchValue = skipSearch ? '' : $('#searchInput').val().toLowerCase();

        const isImportedFolder = currentFolder === 'imported';

        let selectedFormat = null;
        if (!isImportedFolder) {
            if (currentSize && sizeRatioMap[currentSize]) {
                selectedFormat = sizeRatioMap[currentSize];
            } else if (currentFormatFilter !== 'all') {
                selectedFormat = currentFormatFilter;
            }
        }
        const allowedFormats = (!isImportedFolder && currentProduct) ? productFormats : null;

        // Filtrage par recherche/format/produit/taille
        const filtered = images.filter(img => {
            if (!isImportedFolder) {
                if (selectedFormat && img.format !== selectedFormat) return false;
                if (!selectedFormat && allowedFormats && !allowedFormats.includes(img.format)) return false;
            }
            const rawUrl = img.url || img.image_url || '';
            const name = img.name || img.image_prefix || rawUrl.split('/').pop();
            const prompt = typeof img.prompt === 'object'
                ? (img.prompt.text || img.prompt.prompt || JSON.stringify(img.prompt))
                : (img.prompt || '');
            const haystack = `${name} ${prompt}`.toLowerCase();
            return haystack.includes(searchValue);
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
            imgElement.on('click', function (e) {
                e.stopPropagation();
            });
            item.find('.preview-icon').on('click', function (e) {
                e.stopPropagation();
                handleImageClick({ target: imgElement[0] });
            });
            item.on('click', function (e) {
                if ($(e.target).closest('.apply-button, .preview-icon, .file-menu-button, .file-menu-dropdown').length) {
                    return;
                }
                handleImageClick({ target: imgElement[0] });
            });
            item.find('.apply-button').on('click', function (e) {
                e.stopPropagation();
                // Ajoute l'image au canvas (fonction existante)
                const activeVariant = (typeof selectedVariant !== 'undefined' && selectedVariant) ? selectedVariant : window.selectedVariant;
                const placement = window.DesignCache?.getPlacement
                    ? window.DesignCache.getPlacement(window.currentProductId, url, activeVariant?.variant_id)
                    : null;
                const onAdded = function () {
                    if (typeof updateAddImageButtonVisibility === 'function') {
                        updateAddImageButtonVisibility();
                    }
                };
                if (placement) {
                    CanvasManager.addImage(url, { placement }, onAdded);
                } else {
                    CanvasManager.addImage(url, onAdded);
                }
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
