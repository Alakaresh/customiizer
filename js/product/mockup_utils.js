// Shared utilities for mockup generation and product creation

// Keep a shared productData reference and expose globally
export let productData = null;

export function buildProductData(mockupData) {
    const productName = jQuery('.product-name').text().trim();
    const productPrice = selectedVariant.price;

    productData = {
        product_name: productName,
        product_price: productPrice,
        delivery_price: selectedVariant?.delivery_price,
        mockup_url: mockupData.generated_mockup_url || '',
        design_image_url: mockupData.image_base64 || mockupData.image_url,
        design_width: mockupData.width,
        design_height: mockupData.height,
        design_left: mockupData.left,
        design_top: mockupData.top,
        variant_id: mockupData.variant_id,
        placement: mockupData.placement,
        technique: mockupData.technique
    };

    if (window.customizerCache) {
        window.customizerCache.designs = window.customizerCache.designs || {};
        window.customizerCache.designs[window.currentProductId] = productData;
        if (typeof persistCache === 'function') {
            persistCache();
        }
    }

    window.productData = productData;
    return productData;
}

export function cacheUpdatedMockup(viewName, mockupUrl) {
    if (!selectedVariant) return;

    let mockup = selectedVariant.mockups.find(m => m.view_name == viewName);
    if (mockup) {
        mockup.mockup_image = mockupUrl;
    } else {
        mockup = { view_name: viewName, mockup_image: mockupUrl, position_top: 0, position_left: 0 };
        selectedVariant.mockups.push(mockup);
    }

    const cache = window.customizerCache?.variants?.[window.currentProductId];
    if (cache && Array.isArray(cache.variants)) {
        const v = cache.variants.find(v => v.variant_id == selectedVariant.variant_id);
        if (v) {
            let cachedMockup = v.mockups.find(m => m.view_name == viewName);
            if (cachedMockup) {
                cachedMockup.mockup_image = mockupUrl;
            } else {
                cachedMockup = { view_name: viewName, mockup_image: mockupUrl, position_top: 0, position_left: 0 };
                v.mockups.push(cachedMockup);
            }
            if (typeof persistCache === 'function') {
                persistCache();
            }
        }
    }
}

export function createProduct(pd) {
    return fetch('/wp-admin/admin-ajax.php?action=generate_custom_product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'product_data=' + encodeURIComponent(JSON.stringify(pd))
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.generatedProductId = data.data.product_id;
                pd.product_id = data.data.product_id;
                if (window.customizerCache?.designs?.[window.currentProductId]) {
                    window.customizerCache.designs[window.currentProductId].product_id = data.data.product_id;
                    if (typeof persistCache === 'function') {
                        persistCache();
                    }
                }
                return data.data.product_id;
            }
            throw new Error(data.data);
        });
}

window.createProduct = createProduct;

export function getFirstMockup(variant) {
    return variant.mockups.slice().sort((a, b) => a.mockup_id - b.mockup_id)[0];
}

export function updateMockupThumbnail(viewName, mockupUrl) {
    console.log('🆕 Updating mockup thumbnail', { viewName, mockupUrl });

    if (window.mockupTimes?.requestSent) {
        const elapsed = ((Date.now() - window.mockupTimes.requestSent) / 1000).toFixed(1);
        console.log(`⏱️ Mockup displayed after ${elapsed}s`);
        window.mockupTimes.requestSent = null;
    }

    const thumbnailsContainer = document.querySelector('.image-thumbnails');
    if (!thumbnailsContainer) {
        console.error('❌ Impossible de trouver le conteneur des thumbnails !');
        return;
    }

    cacheUpdatedMockup(viewName, mockupUrl);
    const mockup = selectedVariant.mockups.find(m => m.view_name === viewName);

    let thumbnailToUpdate = document.querySelector(`.thumbnail[data-view-name="${viewName}"]`);

    if (thumbnailToUpdate) {
        thumbnailToUpdate.src = mockupUrl;
        thumbnailToUpdate.classList.remove('processing');
    } else {
        console.warn(`⚠️ Aucun thumbnail trouvé pour la vue ${viewName}, ajout en cours...`);
        thumbnailToUpdate = document.createElement('img');
        thumbnailToUpdate.src = mockupUrl;
        thumbnailToUpdate.alt = `Mockup ${viewName}`;
        thumbnailToUpdate.classList.add('thumbnail');
        thumbnailToUpdate.dataset.viewName = viewName;
        if (mockup?.mockup_id) thumbnailToUpdate.dataset.styleId = mockup.mockup_id;
        thumbnailToUpdate.addEventListener('click', function () {
            const mainProductImage = document.getElementById('product-main-image');
            if (!mainProductImage) return;
            if (typeof currentMockup !== 'undefined') currentMockup = mockup;
            window.currentMockup = mockup;
            mainProductImage.src = this.src;
            document.querySelectorAll('.image-thumbnails .thumbnail').forEach(el => el.classList.remove('selected'));
            this.classList.add('selected');
            if (window.jQuery) jQuery(document).trigger('mockupSelected', [typeof selectedVariant !== 'undefined' ? selectedVariant : window.selectedVariant, mockup]);
        });
        thumbnailsContainer.appendChild(thumbnailToUpdate);
    }

    if (productData && viewName === getFirstMockup(selectedVariant)?.view_name) {
        productData.mockup_url = mockupUrl;
        if (!window.generatedProductId && !window.productCreationPromise) {
            window.productCreationPromise = createProduct(productData)
                .catch(err => console.error('❌ Product creation failed:', err))
                .finally(() => { window.productCreationPromise = null; });
        }
    }

    if (viewName === getFirstMockup(selectedVariant)?.view_name || (window.currentMockup && window.currentMockup.view_name === viewName)) {
        thumbnailToUpdate.click();
    }

    if (window.currentLoadingOverlay) {
        window.currentLoadingOverlay.remove();
        window.currentLoadingOverlay = null;
    }
    if (window.overlayInterval) {
        clearInterval(window.overlayInterval);
        window.overlayInterval = null;
    }
}
