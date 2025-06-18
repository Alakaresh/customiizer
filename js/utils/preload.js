// Utility functions to preload product data and persist the cache
// Exposed as ES module and global object

// ----- Cache setup -----
let cacheStorage = window.localStorage;
try {
    const testKey = '__cache_test__';
    cacheStorage.setItem(testKey, testKey);
    cacheStorage.removeItem(testKey);
} catch (e) {
    cacheStorage = window.sessionStorage;
}

try {
    const saved = cacheStorage.getItem('customizerCache');
    window.customizerCache = saved ? JSON.parse(saved) : {};
} catch (e) {
    window.customizerCache = {};
}
window.customizerCache.models = window.customizerCache.models || {};
window.customizerCache.variants = window.customizerCache.variants || {};

export function persistCache() {
    const tmp = { ...window.customizerCache, models: {} };
    cacheStorage.setItem('customizerCache', JSON.stringify(tmp));
}

export async function preloadVariants(products) {
    const fetchPromises = [];
    for (const p of products) {
        if (!window.customizerCache.variants[p.product_id]) {
            const fp = fetch(`/wp-json/api/v1/products/${p.product_id}`)
                .then(r => r.json())
                .then(data => {
                    window.customizerCache.variants[p.product_id] = data;
                })
                .catch(e => console.error('Erreur chargement variantes', p.product_id, e));
            fetchPromises.push(fp);
        }
    }
    await Promise.all(fetchPromises);

    const loader = new THREE.GLTFLoader();
    products.forEach(p => {
        const vars = window.customizerCache.variants[p.product_id]?.variants || [];
        vars.forEach(v => {
            if (v.url_3d && !window.customizerCache.models[v.url_3d]) {
                loader.load(v.url_3d, gltf => {
                    window.customizerCache.models[v.url_3d] = gltf;
                });
            }
        });
    });

    persistCache();
}

export async function preloadAllProducts() {
    try {
        const res = await fetch('/wp-json/api/v1/products/list');
        const products = await res.json();
        if (products && products.length) {
            await preloadVariants(products);
        }
    } catch (e) {
        console.error('Erreur lors du préchargement des produits', e);
    }
}

// Also expose globally for non-module scripts
window.preloadUtils = { persistCache, preloadVariants, preloadAllProducts };
