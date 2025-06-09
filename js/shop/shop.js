document.addEventListener('DOMContentLoaded', function() {
    // Fonction pour rediriger vers la page produit
    window.goToProductPage = function(product) {
        if (product.product_id && /^\d+$/.test(product.product_id)) {
            console.log("Redirection vers le produit:", product);
            
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
        .then(products => {
            if (products && products.length > 0) {
                console.log("Produits récupérés:", products);
                displayProducts(products);
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
