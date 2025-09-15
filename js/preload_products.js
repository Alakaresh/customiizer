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
    window.customizerCache.variantBasics = window.customizerCache.variantBasics || {};

    function persistCache() {
        const tmp = { ...window.customizerCache, models: {} };
        sessionStorage.setItem('customizerCache', JSON.stringify(tmp));
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

        if (Object.keys(window.customizerCache.variantBasics).length === 0) {
            try {
                const res = await fetch('/wp-json/api/v1/products/variants_all');
                if (res.ok) {
                    const data = await res.json();
                    const grouped = {};
                    (data || []).forEach(v => {
                        const pid = v.product_id;
                        if (!grouped[pid]) grouped[pid] = [];
                        grouped[pid].push({
                            variant_id: v.variant_id,
                            size: v.size,
                            ratio_image: v.ratio_image
                        });
                    });
                    window.customizerCache.variantBasics = grouped;
                    persistCache();
                }
            } catch (err) {
                console.error('Preload variants error', err);
            }
        }
    }

    preloadAllData();
});
