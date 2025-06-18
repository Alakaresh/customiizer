(function(){
    try {
        const saved = sessionStorage.getItem('customizerCache');
        window.customizerCache = { ...(window.customizerCache || {}), ...(saved ? JSON.parse(saved) : {}) };
    } catch(e) {
        window.customizerCache = window.customizerCache || {};
    }
    window.customizerCache.products = window.customizerCache.products || [];
    window.customizerCache.variants = window.customizerCache.variants || {};
    window.customizerCache.models = window.customizerCache.models || {};

    function persistCache(){
        const tmp = { ...window.customizerCache, models: {} };
        sessionStorage.setItem('customizerCache', JSON.stringify(tmp));
    }

    async function preloadAll(){
        if (window.customizerCache.products.length && Object.keys(window.customizerCache.variants).length){
            return;
        }
        try {
            const res = await fetch('/wp-json/api/v1/products/list');
            const products = await res.json();
            if (Array.isArray(products)) {
                window.customizerCache.products = products;
                for (const p of products) {
                    if (!window.customizerCache.variants[p.product_id]) {
                        const vr = await fetch(`/wp-json/api/v1/products/${p.product_id}`);
                        const data = await vr.json();
                        window.customizerCache.variants[p.product_id] = data;
                    }
                }
                persistCache();
            }
        } catch(e){
            console.error('[Preload] Erreur chargement produits', e);
        }
    }

    document.addEventListener('DOMContentLoaded', preloadAll);
})();
