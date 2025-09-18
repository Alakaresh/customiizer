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

    const cache = {
        ...readFromStorage(),
        ...(global.previewFormatCache || {})
    };

    global.previewFormatCache = cache;

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
        preloadFormats
    };
})(window);
