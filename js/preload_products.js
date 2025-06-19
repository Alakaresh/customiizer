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

    preloadAllData();
});
