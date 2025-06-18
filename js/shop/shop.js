import { preloadAllProducts, persistCache } from '../utils/preload.js';

document.addEventListener('DOMContentLoaded', async function() {
    const THEME_BASE = '/wp-content/themes/customiizer';

    // Lancement du préchargement global des produits
    preloadAllProducts();

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

    // Le cache global est désormais géré dans utils/preload.js

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

    // Appel API pour récupérer les produits
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
                displayProducts(products);
                hideLoading();
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

});
