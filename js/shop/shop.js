document.addEventListener('DOMContentLoaded', async function() {
    const THEME_BASE = '/wp-content/themes/customiizer';

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
    window.customizerCache.models = window.customizerCache.models || {};
    window.customizerCache.variants = window.customizerCache.variants || {};
    window.customizerCache.products = window.customizerCache.products || [];

    function persistCache() {
        const tmp = { ...window.customizerCache, models: {} };
        sessionStorage.setItem('customizerCache', JSON.stringify(tmp));
    }

    // Fonction pour rediriger vers la page produit
    window.goToProductPage = function(product) {
        if (product.product_id && /^\d+$/.test(product.product_id)) {
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
    let productsPromise;
    if (window.customizerCache.products && window.customizerCache.products.length > 0) {        productsPromise = Promise.resolve(window.customizerCache.products);
    } else {
        productsPromise = fetch('/wp-json/api/v1/products/list')
            .then(response => {
                if (!response.ok) {
                    console.error("Réponse serveur invalide:", response.status);
                    throw new Error('Erreur de réponse du serveur');
                }
                return response.json();
            })
            .then(products => {
                if (Array.isArray(products)) {
                    window.customizerCache.products = products;
                    persistCache();
                }
                return products;
            });
    }

    productsPromise
        .then(async products => {
            if (products && products.length > 0) {                displayProducts(products);
                await preloadVariants(products);
            } else {
                console.warn("Aucun produit trouvé.");
                document.querySelector('.product-list').innerHTML = '<p>Aucun produit trouvé.</p>';
            }
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des produits:', error);
            document.querySelector('.product-list').innerHTML = '<p>Erreur lors de la récupération des produits.</p>';
        });

    // Fonction pour afficher les produits
    function displayProducts(products) {
        const productListContainer = document.querySelector('.product-list');

        products.forEach(product => {
            const imageUrl = product.image || 'default-image-url.jpg';
            const title = product.name || "Nom du produit";
            const minPriceTTC = product.lowest_price !== null ? (parseFloat(product.lowest_price) * 1.20).toFixed(2) : null;
            const minPrice = minPriceTTC !== null ? `${minPriceTTC} € TTC` : "Prix non disponible";

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
        for (const p of products) {
            if (!window.customizerCache.variants[p.product_id]) {
                try {
                    const res = await fetch(`/wp-json/api/v1/products/${p.product_id}`);
                    const data = await res.json();
                    window.customizerCache.variants[p.product_id] = data;
                } catch (e) {
                    console.error('Erreur chargement variantes', p.product_id, e);
                    continue;
                }
            }

            const productVariants = window.customizerCache.variants[p.product_id]?.variants || [];
            productVariants.forEach(v => {
                if (v.url_3d && !window.customizerCache.models[v.url_3d]) {
                    const loader = new THREE.GLTFLoader();
                    loader.load(v.url_3d, gltf => {
                        window.customizerCache.models[v.url_3d] = gltf;
                    });
                }
            });
        }
        persistCache();
    }
});
