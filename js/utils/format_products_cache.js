(function (global) {
    const CACHE_KEY = 'previewFormatCache';

    function readFromStorage() {
        try {
            const saved = global.sessionStorage ? global.sessionStorage.getItem(CACHE_KEY) : null;
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            return {};
        }
    }

    function cloneCustomizerFormatCache() {
        try {
            const source = global.customizerCache?.formatProducts;
            if (!source || typeof source !== 'object') {
                return {};
            }

            return JSON.parse(JSON.stringify(source));
        } catch (error) {
            return {};
        }
    }

    const cache = {
        ...readFromStorage(),
        ...(global.previewFormatCache || {}),
        ...cloneCustomizerFormatCache()
    };

    global.previewFormatCache = cache;

    function normalizeFormatValue(value) {
        return (value || '').toString().trim();
    }

    function logCacheSnapshot(context) {
        try {
            const snapshot = JSON.parse(JSON.stringify(cache));
            console.log('[preview] cache ratios enregistré', {
                contexte: context,
                totalFormats: Object.keys(snapshot).length,
                contenu: snapshot
            });
        } catch (error) {
            console.warn('[preview] impossible de journaliser le cache ratios', {
                contexte: context,
                erreur: error
            });
        }
    }

    function persist(context = 'persist') {
        try {
            if (global.sessionStorage) {
                global.sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
            }
        } catch (error) {}

        logCacheSnapshot(context);
    }

    async function fetchFormat(format) {
        if (!format) {
            return null;
        }

        const response = await fetch(`/wp-json/api/v1/products/format?format=${encodeURIComponent(format)}`);
        const data = await response.json();
        cache[format] = data;
        persist('fetchFormat');
        return data;
    }

    async function ensureFormat(format) {
        if (!format) {
            return null;
        }

        if (Object.prototype.hasOwnProperty.call(cache, format)) {
            return cache[format];
        }

        return fetchFormat(format);
    }

    function get(format) {
        return cache[format];
    }

    function set(format, data, shouldPersist = true) {
        if (!format) {
            return;
        }

        cache[format] = data;
        if (shouldPersist) {
            persist('set');
        }
    }

    function extractProductName(data) {
        if (data && data.success && Array.isArray(data.choices)) {
            const ids = Array.from(new Set(data.choices.map(choice => choice.product_id)));
            if (ids.length === 1 && data.choices[0]) {
                return data.choices[0].product_name;
            }
        }
        return null;
    }

    async function getProductName(format) {
        const data = await ensureFormat(format);
        if (!data) {
            return null;
        }
        return extractProductName(data);
    }

    function buildCacheEntriesFromVariants(variantBasics = {}, products = []) {
        const safeResult = { map: {}, formats: 0, variants: 0 };

        if (!variantBasics || typeof variantBasics !== 'object') {
            return safeResult;
        }

        const entries = Object.entries(variantBasics).filter(([, variants]) => Array.isArray(variants) && variants.length > 0);
        if (entries.length === 0) {
            return safeResult;
        }

        const productNameMap = {};
        (Array.isArray(products) ? products : []).forEach((product) => {
            if (!product || typeof product.product_id === 'undefined') {
                return;
            }

            const pid = Number(product.product_id);
            if (Number.isNaN(pid)) {
                return;
            }

            productNameMap[pid] = product.name || null;
        });

        const dedupe = new Set();
        const ratioMap = new Map();
        let totalVariants = 0;

        entries.forEach(([productId, variants]) => {
            const pid = Number(productId);
            const productName = productNameMap[pid] || null;

            (variants || []).forEach((variant) => {
                if (!variant) {
                    return;
                }

                const ratio = normalizeFormatValue(variant.ratio_image);
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

                if (!ratioMap.has(ratio)) {
                    ratioMap.set(ratio, []);
                }
                ratioMap.get(ratio).push(choice);
                totalVariants += 1;
            });
        });

        if (ratioMap.size === 0) {
            return safeResult;
        }

        const plainMap = {};
        ratioMap.forEach((choices, ratio) => {
            plainMap[ratio] = { success: true, choices };
        });

        return { map: plainMap, formats: ratioMap.size, variants: totalVariants };
    }

    function hydrateFromVariants(variantBasics = {}, products = [], context = 'hydrate') {
        try {
            const { map, formats, variants } = buildCacheEntriesFromVariants(variantBasics, products);

            if (!map || Object.keys(map).length === 0) {
                if (variantBasics && typeof variantBasics === 'object' && Object.keys(variantBasics).length > 0) {
                    console.warn('[preview] hydratation cache ratios ignorée', { contexte: context, raison: 'no_valid_ratios' });
                }
                return { hydrated: false, reason: 'no_valid_ratios' };
            }

            Object.entries(map).forEach(([ratio, payload]) => {
                cache[ratio] = payload;
            });

            persist(`hydrate:${context}`);

            console.log('[preview] cache formats hydraté depuis variantes', {
                contexte: context,
                formats,
                variantes: variants
            });

            return { hydrated: true, formats, variants };
        } catch (error) {
            console.error('[preview] échec hydratation cache formats', { contexte: context, erreur: error });
            return { hydrated: false, reason: 'error', error };
        }
    }

    function preloadFormats(formats = []) {
        const uniqueFormats = Array.from(new Set((formats || []).filter(Boolean)));
        return Promise.all(
            uniqueFormats.map(format =>
                ensureFormat(format).catch(error => {
                    console.error('❌ format preload', format, error);
                    return null;
                })
            )
        );
    }

    global.formatProductsCache = {
        cacheKey: CACHE_KEY,
        getCache: () => cache,
        get,
        set,
        persist,
        fetchFormat,
        ensureFormat,
        getProductName,
        extractProductName,
        preloadFormats,
        hydrateFromVariants,
        buildCacheEntriesFromVariants
    };
})(window);
