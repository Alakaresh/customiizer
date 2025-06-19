document.addEventListener('DOMContentLoaded', function () {
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

    function persistCache() {
        const tmp = { ...window.customizerCache, models: {} };
        sessionStorage.setItem('customizerCache', JSON.stringify(tmp));
    }

    if (window.customizerCache.products.length === 0) {
        fetch('/wp-json/api/v1/products/list')
            .then(res => res.ok ? res.json() : Promise.reject(res.status))
            .then(data => {
                if (Array.isArray(data)) {
                    window.customizerCache.products = data;
                    persistCache();
                }
            })
            .catch(err => console.error('Preload products error', err));
    }
});
