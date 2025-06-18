document.addEventListener('DOMContentLoaded', async function() {
    const THEME_BASE = '/wp-content/themes/customiizer';

    // ---------- Loading indicator ----------
    const productListContainer = document.querySelector('.product-list');
    let loadingOverlay;

    function showLoading() {
        if (!productListContainer) return;
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
        productListContainer.appendChild(loadingOverlay);
    }

    function hideLoading() {
        if (loadingOverlay) loadingOverlay.remove();
    }

    showLoading();

    // ---------- Chargement dynamique de Three.js et GLTFLoader ----------
    async function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    if (typeof THREE === 'undefined') {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
    }
    if (typeof THREE.GLTFLoader === 'undefined') {
        await loadScript(`${THEME_BASE}/assets/GLTFLoader.js`);
    }

    // ---------- Mise en place du cache global ----------
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
    window.customizerCache.products = window.customizerCache.products || [];
    window.customizerCache.productsTimestamp = window.customizerCache.productsTimestamp || 0;

    function persistCache() {
        const tmp = { ...window.customizerCache, models: {} };
        cacheStorage.setItem('customizerCache', JSON.stringify(tmp));
    }

    // Fonction pour rediriger vers la page produit
    window.goToProductPage = function(product) {
        if (product.product_id && /^\d+$/.test(product.product_id)) {
            console.log("Redirection vers le produit:", product);

            persistCache();

            const name = product.name.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Enlève accents
                .replace(/\s+/g, '-')  // Remplace espaces par tirets
                .replace(/[^a-z0-9-]/g, ''); // Supprime les caractères spéciaux

            window.location.href = `/configurateur?nom=${name}&id=${product.product_id}`;
        } else {
            console.warn("ID de produit invalide:", product);
        }
    };

    console.log("Chargement des produits...");

    const CACHE_DURATION = 3600 * 1000; // 1 heure
    const now = Date.now();
    const productsInCache = window.customizerCache.products || [];
    const cacheValid = productsInCache.length > 0 && (now - (window.customizerCache.productsTimestamp || 0) < CACHE_DURATION);

    if (cacheValid) {
        console.log("[Cache] Produits depuis le cache");
        displayProducts(productsInCache);
        hideLoading();
        await preloadVariants(productsInCache);
    } else {
        fetch('/wp-json/api/v1/products/list')
            .then(response => {
                if (!response.ok) {
                    console.error("Réponse serveur invalide:", response.status);
                    throw new Error('Erreur de réponse du serveur');
                }
                return response.json();
            })
            .then(async products => {
                if (products && products.length > 0) {
                    console.log("Produits récupérés:", products);
                    window.customizerCache.products = products;
                    window.customizerCache.productsTimestamp = Date.now();
                    persistCache();
                    displayProducts(products);
                    hideLoading();
                    await preloadVariants(products);
                } else {
                    console.warn("Aucun produit trouvé.");
                    document.querySelector('.product-list').innerHTML = '<p>Aucun produit trouvé.</p>';
                    hideLoading();
                }
            })
            .catch(error => {
                console.error('Erreur lors de la récupération des produits:', error);
                document.querySelector('.product-list').innerHTML = '<p>Erreur lors de la récupération des produits.</p>';
                hideLoading();
            });
    }

    // Fonction pour afficher les produits
    function displayProducts(products) {
        const productListContainer = document.querySelector('.product-list');

        products.forEach(product => {
            const imageUrl = product.image || 'default-image-url.jpg';
            const title = product.name || "Nom du produit";
            const minPrice = product.lowest_price !== null ? `${product.lowest_price} €` : "Prix non disponible";

            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.onclick = () => goToProductPage(product);

            productCard.innerHTML = `
                <img src="${imageUrl}" alt="${title}">
                <h2 class="product-title">${title}</h2>
                <p class="product-price">À partir de ${minPrice}</p>
            `;

            productListContainer.appendChild(productCard);
        });
    }

    // ---------- Préchargement des variantes et modèles 3D ----------
    async function preloadVariants(products) {
        const fetchPromises = [];

        // Collect promises to fetch all product details concurrently
        for (const p of products) {
            if (!window.customizerCache.variants[p.product_id]) {
                const fetchPromise = fetch(`/wp-json/api/v1/products/${p.product_id}`)
                    .then(res => res.json())
                    .then(data => {
                        window.customizerCache.variants[p.product_id] = data;
                    })
                    .catch(e => {
                        console.error('Erreur chargement variantes', p.product_id, e);
                    });
                fetchPromises.push(fetchPromise);
            }
        }

        // Wait for all product fetches to complete
        await Promise.all(fetchPromises);

        const loader = new THREE.GLTFLoader();

        // Load 3D models using a single loader instance
        products.forEach(p => {
            const productVariants = window.customizerCache.variants[p.product_id]?.variants || [];
            productVariants.forEach(v => {
                if (v.url_3d && !window.customizerCache.models[v.url_3d]) {
                    loader.load(v.url_3d, gltf => {
                        window.customizerCache.models[v.url_3d] = gltf;
                    });
                }
            });
        });

        // Persist cache once all fetches and loads have been queued
        persistCache();
    }
});
