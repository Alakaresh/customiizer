document.addEventListener('DOMContentLoaded', () => {
    try {
        const saved = sessionStorage.getItem('customizerCache');
        const savedData = saved ? JSON.parse(saved) : {};
        window.customizerCache = {
            ...(savedData || {}),
            ...(window.customizerCache || {})
        };
    } catch (e) {
        window.customizerCache = window.customizerCache || {};
    }

    window.customizerCache.products = window.customizerCache.products || [];
    window.customizerCache.variants = window.customizerCache.variants || {};

    // Cache format -> produit utilisé par la prévisualisation et la bibliothèque
    try {
        const savedFormats = sessionStorage.getItem('previewFormatCache');
        window.previewFormatCache = {
            ...(savedFormats ? JSON.parse(savedFormats) : {}),
            ...(window.previewFormatCache || {})
        };
    } catch (e) {
        window.previewFormatCache = window.previewFormatCache || {};
    }

    function persistCache() {
        const tmp = { ...window.customizerCache, models: {} };
        sessionStorage.setItem('customizerCache', JSON.stringify(tmp));
    }

    function persistPreviewCache() {
        try {
            sessionStorage.setItem('previewFormatCache', JSON.stringify(window.previewFormatCache));
        } catch (e) {}
    }

    async function preloadAllData() {
        if (window.customizerCache.products.length === 0) {
            try {
                const res = await fetch('/wp-json/api/v1/products/list');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        window.customizerCache.products = data;
                        persistCache();
                    }
                }
            } catch (err) {
                console.error('Preload products error', err);
            }
        }

        for (const p of window.customizerCache.products) {
            if (!window.customizerCache.variants[p.product_id]) {
                try {
                    const res = await fetch(`/wp-json/api/v1/products/${p.product_id}`);
                    if (res.ok) {
                        const data = await res.json();
                        window.customizerCache.variants[p.product_id] = data;
                        persistCache();
                    }
                } catch (err) {
                    console.error('Preload variants error', p.product_id, err);
                }
            }
        }
    }

    function buildFormatCache() {
        const products = window.customizerCache.products || [];
        products.forEach(p => {
            const variantData = window.customizerCache.variants[p.product_id];
            const variants = Array.isArray(variantData)
                ? variantData
                : (variantData && Array.isArray(variantData.variants) ? variantData.variants : []);

            variants.forEach(v => {
                if (!v.ratio_image) return;
                const entry = {
                    product_id: p.product_id,
                    product_name: p.name,
                    variant_id: v.variant_id,
                    variant_size: v.size,
                    color: v.color,
                    ratio_image: v.ratio_image
                };
                if (!window.previewFormatCache[v.ratio_image]) {
                    window.previewFormatCache[v.ratio_image] = { success: true, choices: [] };
                }
                const choices = window.previewFormatCache[v.ratio_image].choices;
                if (!choices.some(c => c.variant_id === v.variant_id)) {
                    choices.push(entry);
                }
            });
        });
        persistPreviewCache();
    }

    preloadAllData().finally(buildFormatCache);
});
