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
    let currentFolder = 'my';         // 'my' (mes images), 'community' ou 'imported'
    let currentSort   = 'date';       // 'name' ou 'date'
    let importedFiles = [];           // Images importées par l'utilisateur
    let myImages = [];                // Images générées par l'utilisateur
    let communityImages = [];         // Images de la communauté
    let currentPage   = 1;            // Page courante
    let currentFormatFilter = 'all';  // 'all' ou ratio sélectionné
    let currentProduct = null;        // ID du produit sélectionné
    let currentSize = null;           // Taille sélectionnée
    let productFormats = [];          // Ratios disponibles pour le produit
    let sizeRatioMap = {};            // Association taille -> ratio
    let resetFormatFilters = () => {};
    const CURRENT_PRODUCT_FILTER_LABEL = 'Produit en cours';
    const PRODUCT_NAME_PLACEHOLDER_PATTERN = /^\s*(nom du produit|product name)\s*$/i;
    const itemsPerPage = 40;       // Nombre d'images par page
    let searchTimeout;             // Délai pour la recherche distante

    // Cache des variantes (taille/ratio) par produit
    let variantCache = {};
    try {
        variantCache = window.customizerCache?.variantBasics || {};
        if (window.customizerCache) {
            window.customizerCache.formatProducts = window.customizerCache.formatProducts || {};
        }
    } catch (e) {
        variantCache = {};
    }

    function normalizeRatio(value) {
        return (value || '').toString().trim();
    }

    function normalizeLabel(value) {
        return (value || '').toString().trim();
    }

    function composeVariantDisplayLabel({ productName, variantLabel, variantSize, variantColor }) {
        const normalizedProduct = normalizeLabel(productName);
        const detailParts = [];

        const normalizedVariantLabel = normalizeLabel(variantLabel);
        if (normalizedVariantLabel && normalizedVariantLabel !== normalizedProduct) {
            detailParts.push(normalizedVariantLabel);
        }

        const normalizedVariantSize = normalizeLabel(variantSize);
        if (normalizedVariantSize && !detailParts.includes(normalizedVariantSize)) {
            detailParts.push(normalizedVariantSize);
        }

        const normalizedVariantColor = normalizeLabel(variantColor);
        if (normalizedVariantColor && !detailParts.includes(normalizedVariantColor)) {
            detailParts.push(normalizedVariantColor);
        }

        if (normalizedProduct && detailParts.length) {
            return `${normalizedProduct} — ${detailParts.join(' • ')}`;
        }

        if (normalizedProduct) {
            return normalizedProduct;
        }

        if (detailParts.length) {
            return detailParts.join(' • ');
        }

        return '';
    }

    function refreshProductRatioDisplayLabel(button) {
        if (!button || !button.length) {
            return '';
        }

        const productName = normalizeLabel(button.data('productName'));
        const variantLabel = normalizeLabel(button.data('variantLabel'));
        const variantSize = normalizeLabel(button.data('variant-size'));
        const variantColor = normalizeLabel(button.data('variantColor'));

        const displayLabel = composeVariantDisplayLabel({
            productName,
            variantLabel,
            variantSize,
            variantColor
        });

        if (displayLabel) {
            button.data('displayLabel', displayLabel);
        } else {
            button.removeData('displayLabel');
        }

        return displayLabel;
    }

    function rememberProductRatioName(button, label) {
        if (!button || !button.length) return false;

        const normalized = normalizeLabel(label);
        const previousName = normalizeLabel(button.data('productName'));
        const previousDisplay = normalizeLabel(button.data('displayLabel'));

        if (normalized) {
            button.data('productName', normalized);
        } else {
            button.removeData('productName');
        }

        const updatedDisplay = normalizeLabel(refreshProductRatioDisplayLabel(button));
        const nameChanged = previousName !== normalized;
        const displayChanged = previousDisplay !== updatedDisplay;

        return nameChanged || displayChanged;
    }

    function buildLocalFormatMap(source) {
        if (!source || typeof source !== 'object') {
            return {};
        }

        const productNameMap = {};
        (window.customizerCache?.products || []).forEach((product) => {
            if (!product) {
                return;
            }

            const pid = Number(product.product_id);
            if (Number.isNaN(pid)) {
                return;
            }

            productNameMap[pid] = product.name || null;
        });

        const dedupe = new Set();
        const map = {};

        Object.entries(source).forEach(([productId, variants]) => {
            const pid = Number(productId);
            const productName = productNameMap[pid] || null;

            (Array.isArray(variants) ? variants : []).forEach((variant) => {
                if (!variant) {
                    return;
                }

                const ratio = normalizeRatio(variant.ratio_image);
                if (!ratio) {
                    return;
                }

                const variantId = Number(variant.variant_id);
                if (!variantId) {
                    return;
                }

                const dedupeKey = `${ratio}:${variantId}`;
                if (dedupe.has(dedupeKey)) {
                    return;
                }
                dedupe.add(dedupeKey);

                const choice = {
                    product_id: pid,
                    product_name: productName,
                    variant_id: variantId,
                    variant_size: variant?.size || null,
                    color: typeof variant?.color === 'string' && variant.color.trim() ? variant.color : null,
                    hexa: typeof variant?.hexa === 'string' && variant.hexa.trim() ? variant.hexa : null,
                    ratio_image: ratio
                };

                if (!map[ratio]) {
                    map[ratio] = { success: true, choices: [] };
                }
                map[ratio].choices.push(choice);
            });
        });

        return map;
    }

    function rememberFormatProducts(source, context) {
        const cache = window.formatProductsCache;

        try {
            let map = {};
            if (cache && typeof cache.buildCacheEntriesFromVariants === 'function') {
                ({ map } = cache.buildCacheEntriesFromVariants(
                    source,
                    window.customizerCache?.products || []
                ));
            } else {
                map = buildLocalFormatMap(source);
            }

            if (!map || typeof map !== 'object' || Object.keys(map).length === 0) {
                return;
            }

            window.customizerCache = window.customizerCache || {};
            window.customizerCache.formatProducts = {
                ...(window.customizerCache.formatProducts || {}),
                ...map
            };

            console.log('[file-library] ratios produits mémorisés', {
                contexte: context,
                formatsAjoutes: Object.keys(map).length,
                totalFormats: Object.keys(window.customizerCache.formatProducts).length
            });
        } catch (error) {
            console.warn('[file-library] impossible de mémoriser les ratios produits', { contexte: context, erreur: error });
        }
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
                        ratio_image: v.ratio_image,
                        color: v.color || null,
                        hexa: v.hexa || null
                    });
                });
                variantCache = grouped;
                window.customizerCache = window.customizerCache || {};
                window.customizerCache.variantBasics = variantCache;
                rememberFormatProducts(variantCache, 'variants_fetch');
                try {
                    const tmp = { ...window.customizerCache, models: {} };
                    sessionStorage.setItem('customizerCache', JSON.stringify(tmp));
                } catch (e) {}

                try {
                    if (window.formatProductsCache?.hydrateFromVariants) {
                        window.formatProductsCache.hydrateFromVariants(
                            variantCache,
                            window.customizerCache.products || [],
                            'file_library'
                        );
                    }
                } catch (error) {
                    console.warn('[file-library] hydratation cache formats impossible', error);
                }

                return true;
            } catch (err) {
                console.error('❌ preload variants', err);
                return false;
            }
        }

        return false;
    }
    ensureVariantCache().then((fetched) => {
        if (!fetched && Object.keys(variantCache).length > 0) {
            rememberFormatProducts(variantCache, 'variants_existing');
            try {
                const tmp = { ...window.customizerCache, models: {} };
                sessionStorage.setItem('customizerCache', JSON.stringify(tmp));
            } catch (e) {}
        }
    });

    async function getProductNameForFormat(fmt) {
        if (!fmt || !window.formatProductsCache) {
            return null;
        }
        try {
            return await window.formatProductsCache.getProductName(fmt);
        } catch (err) {
            console.error('❌ format fetch', fmt, err);
            return null;
        }
    }

    function buildCustomizeUrl(options = {}) {
        const basePath = '/customiize';
        const params = new URLSearchParams();

        const ratio = (options.ratio || '').toString().trim();
        if (ratio) {
            params.set('ratio', ratio);
        }

        const product = options.product;
        if (product) {
            params.set('product', product);
        }

        const size = (options.size || '').toString().trim();
        if (size) {
            params.set('size', size);
        }

        const query = params.toString();
        return query ? `${basePath}?${query}` : basePath;
    }

    /**
     * Met à jour le libellé du format sélectionné.
     * @param {string} fmt                       Ratio de l'image.
     * @param {boolean} [showCurrentDesignLabel] Affiche un libellé générique lié au produit en cours.
     */
    function updateFormatLabel(fmt, showCurrentDesignLabel = false) {
        const btn = $('#open-format-menu');
        btn.addClass('active');

        if (!fmt) {
            btn.text('Format');
            return;
        }

        const currentVariantSize = $('#filter-product-ratio').data('variant-size');
        const variantSuffix = currentVariantSize ? ` — ${currentVariantSize}` : '';

        const ratioLabel = `Format: ${fmt}${variantSuffix}`;
        btn.text(ratioLabel);

        if (showCurrentDesignLabel && fmt !== 'all') {
            const productRatioButton = $('#filter-product-ratio');
            if (productRatioButton.length) {
                const storedDisplayLabel = normalizeLabel(refreshProductRatioDisplayLabel(productRatioButton));
                if (storedDisplayLabel) {
                    btn.text(`Format: ${storedDisplayLabel}`);
                } else {
                    let storedProductName = normalizeLabel(productRatioButton.data('productName'));
                    if (!storedProductName) {
                        const fallbackProductName = normalizeLabel($('.product-name').first().text());
                        if (fallbackProductName && !PRODUCT_NAME_PLACEHOLDER_PATTERN.test(fallbackProductName)) {
                            storedProductName = fallbackProductName;
                            productRatioButton.data('productName', storedProductName);
                            const refreshed = normalizeLabel(refreshProductRatioDisplayLabel(productRatioButton));
                            if (refreshed) {
                                btn.text(`Format: ${refreshed}`);
                                return;
                            }
                        }
                    }
                    if (storedProductName) {
                        const storedVariantSize = normalizeLabel(productRatioButton.data('variant-size'));
                        const storedSuffix = storedVariantSize ? ` — ${storedVariantSize}` : variantSuffix;
                        btn.text(`Format: ${storedProductName}${storedSuffix}`);
                    }
                }
            }

            getProductNameForFormat(fmt).then(productName => {
                if (!productName) return;
                if (currentFormatFilter !== fmt) return;

                const productRatioButtonAsync = $('#filter-product-ratio');
                if (productRatioButtonAsync.length) {
                    const trimmed = normalizeLabel(productName);
                    if (trimmed) {
                        productRatioButtonAsync.data('productName', trimmed);
                    } else {
                        productRatioButtonAsync.removeData('productName');
                    }
                    const refreshedDisplay = normalizeLabel(refreshProductRatioDisplayLabel(productRatioButtonAsync));
                    if (refreshedDisplay) {
                        btn.text(`Format: ${refreshedDisplay}`);
                        return;
                    }
                }

                const activeVariantSize = $('#filter-product-ratio').data('variant-size');
                const asyncVariantSuffix = activeVariantSize ? ` — ${activeVariantSize}` : '';
                const asyncProductName = normalizeLabel(productName);
                btn.text(`Format: ${asyncProductName || fmt}${asyncVariantSuffix}`);
            });
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
        const formatBlock = $('#format-block');

        function readProductNameFromDom() {
            const label = normalizeLabel($('.product-name').first().text());
            if (!label || PRODUCT_NAME_PLACEHOLDER_PATTERN.test(label)) {
                return '';
            }
            return label;
        }

        function syncProductRatioNameFromDom() {
            rememberProductRatioName(productRatioButton, readProductNameFromDom());
        }

        if (formatBlock.length) {
            formatBlock.show();
        }

        syncProductRatioNameFromDom();

        if (productRatioButton.length && typeof MutationObserver !== 'undefined') {
            const existingObserver = productRatioButton.data('productNameObserver');
            if (existingObserver && typeof existingObserver.disconnect === 'function') {
                existingObserver.disconnect();
            }

            const productNameElement = $('.product-name').first().get(0);
            if (productNameElement) {
                const observer = new MutationObserver(() => {
                    const freshLabel = readProductNameFromDom();
                    const changed = rememberProductRatioName(productRatioButton, freshLabel);
                    if (!changed) return;
                    if (productRatioButton.hasClass('active') && currentFormatFilter !== 'all') {
                        updateFormatLabel(currentFormatFilter, true);
                    }
                });
                observer.observe(productNameElement, { childList: true, characterData: true, subtree: true });
                productRatioButton.data('productNameObserver', observer);
            }
        }

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

        function extractVariantMeta(variant) {
            if (!variant || typeof variant !== 'object') {
                return { size: '', label: '', color: '' };
            }

            const size = normalizeLabel(
                variant.size
                || variant.size_name
                || variant.sizeName
                || variant.variant_size
                || variant.variantSize
            );

            const labelCandidates = [
                variant.variant_label,
                variant.variantLabel,
                variant.label,
                variant.name,
                variant.variant_name,
                variant.variantName,
                variant.display_name,
                variant.displayName,
                variant.size_label,
                variant.sizeLabel
            ];

            let label = '';
            for (const candidate of labelCandidates) {
                const normalized = normalizeLabel(candidate);
                if (normalized && normalized !== size) {
                    label = normalized;
                    break;
                }
            }

            const colorCandidates = [
                variant.color,
                variant.color_label,
                variant.colorLabel,
                variant.colour,
                variant.colour_label,
                variant.colourLabel
            ];

            let color = '';
            for (const candidate of colorCandidates) {
                const normalized = normalizeLabel(candidate);
                if (normalized) {
                    color = normalized;
                    break;
                }
            }

            return { size, label, color };
        }

        resetFormatFilters = function () {
            currentFormatFilter = 'all';
            currentProduct = null;
            currentSize = null;
            productFormats = [];
            sizeRatioMap = {};

            $('#mainFormatFilters .format-main').removeClass('active');
            $('#filter-all').addClass('active');
            $('#formatOptions').removeClass('active');
            $('#formatOptions .format-btn').removeClass('active');
            $('#product-block').removeClass('active');
            $('#product-block button').removeClass('active');
            sizeBlock.hide();
            $('#sizeButtons').empty();
            $('#open-format-menu').removeClass('active').text('Format');
            if (productRatioButton.length) {
                productRatioButton
                    .removeClass('active')
                    .text(CURRENT_PRODUCT_FILTER_LABEL)
                    .removeData('productName')
                    .removeData('variantLabel')
                    .removeData('variantColor')
                    .removeData('displayLabel')
                    .removeData('ratio')
                    .removeData('variant-size');
            }
        };

        function applyProductRatioFilter(ratio) {
            if (!ratio) return;
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
            updateFormatLabel(ratio, true);

            currentPage = 1;
            renderFileList();
        }

        function selectCurrentProductFormat() {
            const variant = resolveVariant();
            const storedRatio = productRatioButton.data('ratio');
            const ratio = (variant && variant.ratio_image) ? variant.ratio_image : storedRatio;

            if (!ratio) {
                return false;
            }

            applyProductRatioFilter(ratio);
            return true;
        }

        function updateProductRatioButton(variantCandidate) {
            if (!productRatioButton.length) return;
            const variant = resolveVariant(variantCandidate);
            const ratio = variant?.ratio_image || null;
            const wasActive = productRatioButton.hasClass('active');

            if (ratio) {
                const { size, label, color } = extractVariantMeta(variant);
                productRatioButton
                    .prop('disabled', false)
                    .text(CURRENT_PRODUCT_FILTER_LABEL)
                    .data('ratio', ratio);

                if (size) {
                    productRatioButton.data('variant-size', size);
                } else {
                    productRatioButton.removeData('variant-size');
                }

                if (label) {
                    productRatioButton.data('variantLabel', label);
                } else {
                    productRatioButton.removeData('variantLabel');
                }

                if (color) {
                    productRatioButton.data('variantColor', color);
                } else {
                    productRatioButton.removeData('variantColor');
                }

                refreshProductRatioDisplayLabel(productRatioButton);

                rememberProductRatioName(productRatioButton, readProductNameFromDom());

                if (wasActive && currentFormatFilter !== ratio) {
                    applyProductRatioFilter(ratio);
                }
            } else {
                productRatioButton
                    .prop('disabled', true)
                    .removeClass('active')
                    .text(CURRENT_PRODUCT_FILTER_LABEL)
                    .removeData('productName')
                    .removeData('variantLabel')
                    .removeData('variantColor')
                    .removeData('displayLabel')
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
            formatBlock.show();
            renderFileList();
        });
        $('#folder-community').on('click', function () {
            currentFolder = 'community';
            currentPage = 1;
            $('#folder-selector button').removeClass('active');
            $(this).addClass('active');
            formatBlock.show();
            renderFileList();
        });
        $('#folder-imported').on('click', function () {
            currentFolder = 'imported';
            currentPage = 1;
            $('#folder-selector button').removeClass('active');
            $(this).addClass('active');
            resetFormatFilters();
            formatBlock.hide();
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
            resetFormatFilters();
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
                applyProductRatioFilter(ratio);
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

        $(document)
            .off('productSelected.fileLibrary')
            .on('productSelected.fileLibrary', function () {
                syncProductRatioNameFromDom();
            });

        updateProductRatioButton(resolveVariant());
        window.FileLibrary.selectCurrentProductFormat = selectCurrentProductFormat;

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
                                        updateFormatLabel(currentFormatFilter, true);
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
            resetFormatFilters();
            formatBlock.hide();
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

        const rawSearchValue = $('#searchInput').val() || '';
        const searchValue = skipSearch ? '' : rawSearchValue.toLowerCase();
        const hasSearchFilter = rawSearchValue.trim().length > 0;

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

        const hasFormatFilter = !isImportedFolder && (
            (currentFormatFilter && currentFormatFilter !== 'all') ||
            (currentProduct !== null && currentProduct !== undefined) ||
            (currentSize !== null && currentSize !== undefined)
        );
        const filterActive = hasSearchFilter || hasFormatFilter;

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

        if (pageItems.length === 0) {
            if (filterActive) {
                const ratioForCustomize = (() => {
                    if (selectedFormat) {
                        return selectedFormat;
                    }
                    if (currentFormatFilter && currentFormatFilter !== 'all') {
                        return currentFormatFilter;
                    }
                    if (currentSize && sizeRatioMap[currentSize]) {
                        return sizeRatioMap[currentSize];
                    }
                    if (allowedFormats && Array.isArray(allowedFormats)) {
                        const uniqueFormats = Array.from(new Set(allowedFormats.filter(Boolean)));
                        if (uniqueFormats.length === 1) {
                            return uniqueFormats[0];
                        }
                    }
                    const productRatioButton = $('#filter-product-ratio');
                    const storedRatio = productRatioButton.data('ratio');
                    if (storedRatio) {
                        return storedRatio;
                    }
                    return null;
                })();

                const customizeUrl = buildCustomizeUrl({
                    ratio: ratioForCustomize,
                    product: currentProduct,
                    size: currentSize,
                });

                const formatContext = (() => {
                    if (!hasFormatFilter) return null;

                    const productLabel = ($('#product-block button.active').first().text() || '').trim();
                    const sizeLabel = ($('#sizeButtons button.active').first().text() || '').trim();
                    const ratioLabel = ($('#formatOptions .format-btn.active').not('#format-product').first().text() || '').trim();
                    const productRatioButton = $('#filter-product-ratio');
                    const productRatioActive = productRatioButton.hasClass('active');
                    const productRatioDisplay = productRatioActive
                        ? (productRatioButton.data('displayLabel') || '').toString().trim()
                        : '';
                    const productRatioName = productRatioActive
                        ? (productRatioButton.data('productName') || '').toString().trim()
                        : '';
                    const productVariantSize = productRatioActive
                        ? (productRatioButton.data('variant-size') || '').toString().trim()
                        : '';
                    const productVariantColor = productRatioActive
                        ? (productRatioButton.data('variantColor') || '').toString().trim()
                        : '';

                    const formatParts = [];
                    if (productLabel) {
                        formatParts.push(productLabel);
                    } else if (productRatioDisplay) {
                        formatParts.push(productRatioDisplay);
                    } else if (productRatioName) {
                        formatParts.push(productRatioName);
                    }

                    const sizeParts = [];
                    if (sizeLabel) sizeParts.push(sizeLabel);
                    if (!productRatioDisplay) {
                        if (productVariantSize && !sizeParts.includes(productVariantSize)) {
                            sizeParts.push(productVariantSize);
                        }
                        if (productVariantColor && !sizeParts.includes(productVariantColor)) {
                            sizeParts.push(productVariantColor);
                        }
                    }
                    formatParts.push(...sizeParts);

                    let display = formatParts.join(' — ');
                    if (!display) {
                        if (ratioLabel) {
                            display = ratioLabel;
                        } else if (currentSize) {
                            display = currentSize;
                        } else if (currentFormatFilter && currentFormatFilter !== 'all') {
                            display = currentFormatFilter;
                        }
                    }

                    if (!display) return null;

                    const prefix = (productLabel || productRatioDisplay || productRatioName) ? 'pour' : 'au format';
                    return { display, prefix };
                })();

                const trimmedSearch = rawSearchValue.trim();
                const descriptorParts = [];
                if (formatContext) descriptorParts.push(`${formatContext.prefix} ${formatContext.display}`);
                if (trimmedSearch) descriptorParts.push(`correspondant à « ${trimmedSearch} »`);
                const combinedDescription = descriptorParts.join(' et ');

                let titleText = 'Aucune image ne correspond à vos filtres.';
                if (formatContext && !trimmedSearch) {
                    titleText = `Aucune image ${formatContext.prefix} ${formatContext.display}.`;
                } else if (!formatContext && trimmedSearch) {
                    titleText = `Aucun résultat pour « ${trimmedSearch} ».`;
                }

                const baseSubtitle = 'Générez une image sur Customiize ou explorez la Communauté pour découvrir des visuels partagés.';
                const subtitleText = combinedDescription
                    ? `Générez une image ${combinedDescription} sur Customiize ou explorez la Communauté pour découvrir des visuels partagés.`
                    : baseSubtitle;

                let primaryLabel = 'Générer une image adaptée à ces filtres';
                if (formatContext) {
                    primaryLabel = `Générer une image ${formatContext.prefix} ${formatContext.display}`;
                } else if (!formatContext && trimmedSearch) {
                    primaryLabel = 'Générer une image correspondant à votre recherche';
                }

                const emptyState = $(
                    `<div class="file-library-empty">
                        <p class="file-library-empty-title"></p>
                        <p class="file-library-empty-subtitle"></p>
                        <div class="file-library-empty-actions">
                            <a class="file-library-empty-primary" target="_blank" rel="noopener"></a>
                            <button type="button" class="file-library-empty-secondary">Communauté</button>
                        </div>
                    </div>`
                );
                emptyState.find('.file-library-empty-title').text(titleText.trim());
                const subtitleParagraph = emptyState.find('.file-library-empty-subtitle');
                subtitleParagraph.text(subtitleText);
                const customizeLink = emptyState.find('.file-library-empty-primary');
                customizeLink.text(primaryLabel);
                customizeLink.attr('href', customizeUrl);

                if (filterActive) {
                    const resetLink = $('<a href="#" class="file-library-reset-filters">Réinitialiser les filtres</a>');
                    resetLink.on('click', function (e) {
                        e.preventDefault();
                        if (hasSearchFilter) {
                            $('#searchInput').val('');
                        }
                        if (hasFormatFilter && typeof resetFormatFilters === 'function') {
                            resetFormatFilters();
                        }
                        currentPage = 1;
                        if (currentFolder === 'community') {
                            clearTimeout(searchTimeout);
                            fetchCommunityImages('');
                        } else {
                            renderFileList();
                        }
                    });
                    subtitleParagraph.append(' Vous pouvez aussi ');
                    subtitleParagraph.append(resetLink);
                    subtitleParagraph.append('.');
                }
                emptyState.find('.file-library-empty-secondary').on('click', function () {
                    const communityButton = $('#folder-community');
                    communityButton.trigger('click');
                    communityButton.trigger('focus');
                });
                container.append(emptyState);
            } else if (currentFolder === 'my') {
                const emptyState = $(
                    `<div class="file-library-empty">
                        <p class="file-library-empty-title">Vous n'avez pas encore d'image enregistrée.</p>
                        <p class="file-library-empty-subtitle">Générez une image sur Customiize ou explorez la Communauté pour utiliser les visuels partagés.</p>
                        <div class="file-library-empty-actions">
                            <a class="file-library-empty-primary" target="_blank" rel="noopener">Générer une image</a>
                            <button type="button" class="file-library-empty-secondary">Communauté</button>
                        </div>
                    </div>`
                );
                emptyState
                    .find('.file-library-empty-primary')
                    .attr('href', buildCustomizeUrl());
                emptyState.find('.file-library-empty-secondary').on('click', function () {
                    const communityButton = $('#folder-community');
                    communityButton.trigger('click');
                    communityButton.trigger('focus');
                });
                container.append(emptyState);
            } else {
                container.append(
                    `<div class="file-library-empty">
                        <p class="file-library-empty-message">Aucune image disponible pour le moment.</p>
                    </div>`
                );
            }
            renderPagination(totalPages);
            return;
        }

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
        render: renderFileList,
        selectCurrentProductFormat: () => false,
        resetFilters: () => {
            if (typeof resetFormatFilters === 'function') {
                resetFormatFilters();
            }
        }
    };
})(jQuery);
