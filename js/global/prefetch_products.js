(function(){
    const CACHE_KEY = 'customizerCache';
    const API_URL = '/wp-json/api/v1/products/list';
    const EXPIRY = 3600 * 1000; // 1 hour

    let storage = window.localStorage;
    try {
        const t='__cache_test__';
        storage.setItem(t,t);
        storage.removeItem(t);
    } catch(e){
        storage = window.sessionStorage;
    }

    function loadCache(){
        try {
            const saved = storage.getItem(CACHE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch(e){
            return {};
        }
    }

    window.customizerCache = window.customizerCache || loadCache();
    const cache = window.customizerCache;
    cache.products = cache.products || [];
    cache.productsTimestamp = cache.productsTimestamp || 0;

    function persist(){
        const tmp = { ...cache, models: {} };
        storage.setItem(CACHE_KEY, JSON.stringify(tmp));
    }

    function needsFetch(){
        if (!cache.products || cache.products.length === 0) return true;
        return (Date.now() - (cache.productsTimestamp || 0)) > EXPIRY;
    }

    async function fetchProducts(){
        try {
            const res = await fetch(API_URL);
            if(!res.ok) throw new Error(res.status);
            const data = await res.json();
            if(Array.isArray(data)){
                cache.products = data;
                cache.productsTimestamp = Date.now();
                persist();
            }
        } catch(err){
            console.error('[Prefetch] erreur chargement produits', err);
        }
    }

    if(needsFetch()){
        fetchProducts();
    }
})();
