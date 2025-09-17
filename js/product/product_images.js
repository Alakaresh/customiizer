let productData = null;
window.currentProductId = window.currentProductId || null;
window.generatedProductId = window.generatedProductId || null;
window.productCreationPromise = window.productCreationPromise || null;

window.createProduct = function(pd) {
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
                if (window.DesignCache?.updateProductId) {
                    window.DesignCache.updateProductId(window.currentProductId, data.data.product_id);
                } else if (window.customizerCache?.designs?.[window.currentProductId]) {
                    window.customizerCache.designs[window.currentProductId].product_id = data.data.product_id;
                    if (typeof persistCache === 'function') {
                        persistCache();
                    }
                }
                return data.data.product_id;
            }
            throw new Error(data.data);
        });
};

// Gestion des groupes d'images de la bottom-bar
const IMAGES_PER_GROUP = 12;
let bottomBarImages = [];
let currentGroupIndex = 0;
// Partage d'un objet global pour suivre les temps de génération
window.mockupTimes = window.mockupTimes || {};
const mockupTimes = window.mockupTimes;
// Stocke temporairement le dernier clic avant l'appel à generateMockup
mockupTimes.pending = null;
mockupTimes.requestSent = null;
let currentLoadingOverlay = null;
let mockupCooldownUntil = 0;
let cooldownInterval = null;
const overlayMessages = [
    "\uD83D\uDCE6 Pr\u00E9paration du mockup...",
    "\uD83C\uDFA8 Mise en place du design...",
    "\uD83D\uDDBC\uFE0F Construction de l'aper\u00E7u...",
    "\uD83D\uDE80 Finalisation..."
];
let overlayInterval = null;
let overlayIndex = 0;

function imageUrlToBase64(url) {
        return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = function () {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        try {
                                const dataUrl = canvas.toDataURL('image/png');
                                resolve(dataUrl);
                        } catch (err) {
                                reject(err);
                        }
                };
                img.onerror = reject;
                img.src = url;
        });
}

function getLatestMockup(variant) {
    return variant.mockups.slice().sort((a, b) => a.mockup_id - b.mockup_id).pop();
}

function getFirstMockup(variant) {
    return variant.mockups.slice().sort((a, b) => a.mockup_id - b.mockup_id)[0];
}

// Création de l'info-bulle globale
const tooltip = document.createElement("div");
tooltip.classList.add("dynamic-tooltip");
tooltip.innerText = "Preview this design on the product";
document.body.appendChild(tooltip);

// Affichage des images et ajout du clic pour générer un mockup
function displayImagesInBottomBar(images) {
        bottomBarImages = images || [];
        currentGroupIndex = 0;
        renderCurrentGroup();
        updateArrows();
}

function renderCurrentGroup() {
        const contentDiv = document.querySelector(".bottom-bar .content");
        if (!contentDiv) {
                console.error("❌ Erreur : Impossible de trouver .bottom-bar .content");
                return;
        }

        contentDiv.innerHTML = "";
        const start = currentGroupIndex * IMAGES_PER_GROUP;
        const groupImages = bottomBarImages.slice(start, start + IMAGES_PER_GROUP);
        groupImages.forEach(image => {
                const imgElement = document.createElement("img");
                imgElement.src = image.image_url;
                imgElement.alt = image.prompt || "Image générée";
                imgElement.classList.add("thumbnail");

		// ✅ Événements pour afficher l'info-bulle au bon endroit
		imgElement.addEventListener("mouseenter", (event) => {
			tooltip.style.opacity = "1";
			tooltip.style.pointerEvents = "none"; // Empêche l'info-bulle d'interagir
		});

		imgElement.addEventListener("mousemove", (event) => {
			tooltip.style.left = `${event.pageX + 10}px`;
			tooltip.style.top = `${event.pageY + 10}px`;
		});

                imgElement.addEventListener("mouseleave", () => {
                        tooltip.style.opacity = "0";
                });

                imgElement.addEventListener("click", () => {
                        const url = image.image_url;

                        const addToCanvas = () => {
                                if (typeof CanvasManager === 'undefined') return;
                                const activeVariant = (typeof selectedVariant !== 'undefined' && selectedVariant) ? selectedVariant : window.selectedVariant;
                                const placement = window.DesignCache?.getPlacement
                                        ? window.DesignCache.getPlacement(window.currentProductId, url, activeVariant?.variant_id)
                                        : null;
                                const afterAdd = () => {
                                        const addImageButton = jQuery('#addImageButton');
                                        const imageControls = jQuery('.image-controls');
                                        const visualHeader = jQuery('.visual-header');

                                        addImageButton.hide();
                                        imageControls.css('display', 'flex').show();
                                        visualHeader.css('display', 'flex');
                                        jQuery('.visual-zone').addClass('with-header');
                                        CanvasManager.resizeToContainer('product2DContainer');
                                };
                                if (placement) {
                                        CanvasManager.addImage(url, { placement }, afterAdd);
                                } else {
                                        CanvasManager.addImage(url, afterAdd);
                                }
                        };

                        if (jQuery('#customizeModal').is(':visible')) {
                                addToCanvas();
                        } else {
                                const designButton = document.querySelector('.design-button');
                                if (designButton) {
                                        window.skipDesignRestoreOnce = true;
                                        designButton.click();
                                        const interval = setInterval(() => {
                                                if (document.getElementById('productCanvas')) {
                                                        clearInterval(interval);
                                                        addToCanvas();
                                                }
                                        }, 100);
                                        setTimeout(() => clearInterval(interval), 10000);
                                } else {
                                        window.skipDesignRestoreOnce = false;
                                }
                        }
                });

                contentDiv.appendChild(imgElement);
        });

        // Ajoute un petit effet de défilement pour montrer que la barre est scrollable
        contentDiv.scrollLeft = 0;
}


async function generateMockup(mockupData) {
        // Stocke les données pour la création du produit
        productData = buildProductData(mockupData);
        if (Date.now() < mockupCooldownUntil) {
                const remain = Math.ceil((mockupCooldownUntil - Date.now()) / 1000);
                showRateLimitMessage(remain);
                return;
        }

        if (!mockupData || !selectedVariant?.mockups?.length) {
                console.error("❌ Données insuffisantes pour générer un mockup.");
                alert("Impossible de générer le mockup. Données manquantes.");
                return;
        }

        const mainProductImage = document.getElementById("product-main-image");

        // Mesure du temps écoulé depuis le clic
        const requestStart = Date.now();
        if (mockupTimes.pending) {
                const delay = ((requestStart - mockupTimes.pending) / 1000).toFixed(1);        }
        mockupTimes.requestSent = requestStart;

        document.querySelectorAll('.thumbnail').forEach(el => el.classList.add("processing"));
        mainProductImage?.classList.add("loading");

        let loadingOverlay = document.querySelector(".loading-overlay");
        if (!loadingOverlay) {
                loadingOverlay = document.createElement("div");
                loadingOverlay.classList.add("loading-overlay");
                loadingOverlay.innerHTML =
                        '<div class="loading-spinner"></div><div class="loading-text">' +
                        overlayMessages[0] +
                        '</div>';
                mainProductImage?.parentNode.appendChild(loadingOverlay);
        } else {
                const textEl = loadingOverlay.querySelector('.loading-text');
                if (textEl) textEl.textContent = overlayMessages[0];
        }
        currentLoadingOverlay = loadingOverlay;
        overlayIndex = 0;
        if (overlayInterval) clearInterval(overlayInterval);
        overlayInterval = setInterval(() => {
                const textEl = loadingOverlay.querySelector('.loading-text');
                if (!textEl) return;
                if (overlayIndex + 1 < overlayMessages.length) {
                        overlayIndex++;
                        textEl.textContent = overlayMessages[overlayIndex];
                } else {
                        clearInterval(overlayInterval);
                        overlayInterval = null;
                }
        }, 4000);

        let base64Image;
        try {
                base64Image = await imageUrlToBase64(mockupData.image_url);
        } catch (err) {
                console.error('❌ Impossible de convertir l\'image en base64', err);
                return;
        }

        const form = new FormData();
        form.append("action", "generate_mockup");
        form.append("image_base64", base64Image);
        form.append("variant_id", mockupData.variant_id);
        form.append("width", mockupData.width);
        form.append("height", mockupData.height);
        form.append("left", mockupData.left);
        form.append("top", mockupData.top);

        const firstViewName = getFirstMockup(selectedVariant)?.view_name;

        fetch("/wp-admin/admin-ajax.php", { method: "POST", body: form })
                .then(res => res.json())
                .then(data => {                        if (data.data?.timings) {                        }

                        if (data.success && Array.isArray(data.data?.files)) {
                                mockupTimes.pending = null;
                                data.data.files
                                        .filter(f => f.name !== 'texture')
                                        .forEach(f => updateMockupThumbnail(f.name, f.base64 || f.url));
                        } else if (data.success && data.data?.url && firstViewName) {
                                mockupTimes.pending = null;
                                updateMockupThumbnail(firstViewName, data.data.url);
                        } else if (data.success && data.data?.mockup_url && firstViewName) {
                                mockupTimes.pending = null;
                                updateMockupThumbnail(firstViewName, data.data.mockup_url);
                        } else {
                                console.error("❌ Erreur création mockup :", data.message);
                        }
                })
                .catch(err => {
                        console.error("❌ Erreur réseau :", err.message);
                })
                .finally(() => {
                        document.querySelectorAll('.thumbnail').forEach(el => el.classList.remove("processing"));
                        mainProductImage?.classList.remove("loading");
                        mockupTimes.requestSent = null;
                });
}

function buildProductData(mockupData) {
	const productName = jQuery('.product-name').text().trim();
	const productPrice = selectedVariant.price;

        const designUrl = mockupData.image_url;
        const canvasUrl = mockupData.canvas_image_url || designUrl;

        const productData = {
                product_name: productName,
                product_price: productPrice,
                delivery_price: selectedVariant?.delivery_price,
                mockup_url: mockupData.generated_mockup_url || "",
                design_image_url: designUrl,
                canvas_image_url: canvasUrl,
                design_width: mockupData.width,
                design_height: mockupData.height,
                design_left: mockupData.left,
                design_top: mockupData.top,
                design_angle: mockupData.angle || 0,
                design_flipX: mockupData.flipX || false,
                variant_id: mockupData.variant_id,
                placement: mockupData.placement,
                technique: mockupData.technique,
                product_id: window.currentProductId != null ? String(window.currentProductId) : null
        };

        if (window.DesignCache?.saveDesign) {
                window.DesignCache.saveDesign(window.currentProductId, productData);
        } else if (window.customizerCache) {
                window.customizerCache.designs = window.customizerCache.designs || {};
                window.customizerCache.designs[window.currentProductId] = productData;
                if (typeof persistCache === 'function') {
                        persistCache();
                }
        }

        return productData;
}

function cacheUpdatedMockup(viewName, mockupUrl) {
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

// Réactive le thumbnail actuellement sélectionné
function triggerSelectedThumbnail() {
        const activeThumb = document.querySelector('.image-thumbnails .thumbnail.selected');
        if (activeThumb) {
                activeThumb.click();
        }
}

function showRateLimitMessage(seconds) {
        let msg = document.getElementById('rate-limit-message');
        if (!msg) {
                msg = document.createElement('div');
                msg.id = 'rate-limit-message';
                msg.className = 'rate-limit-message';
                document.body.appendChild(msg);
        }
        msg.style.display = 'block';
        msg.textContent = `Surcharge serveur, veuillez attendre ${seconds} secondes.`;

        if (cooldownInterval) clearInterval(cooldownInterval);
        cooldownInterval = setInterval(() => {
                const remain = Math.ceil((mockupCooldownUntil - Date.now()) / 1000);
                if (remain > 0) {
                        msg.textContent = `Surcharge serveur, veuillez attendre ${remain} secondes.`;
                } else {
                        msg.style.display = 'none';
                        clearInterval(cooldownInterval);
                        cooldownInterval = null;
                }
        }, 1000);
}


function updateMockupThumbnail(viewName, mockupUrl) {
        // 🕒 Log du temps entre l'envoi de la requête et l'affichage de l'image
        if (mockupTimes.requestSent) {
                const elapsed = ((Date.now() - mockupTimes.requestSent) / 1000).toFixed(1);                mockupTimes.requestSent = null;
        }

        const thumbnailsContainer = document.querySelector(".image-thumbnails");
        if (!thumbnailsContainer) {
                console.error("❌ Impossible de trouver le conteneur des thumbnails !");
                return;
        }

        cacheUpdatedMockup(viewName, mockupUrl);
        const mockup = selectedVariant.mockups.find(m => m.view_name === viewName);

        let thumbnailToUpdate = document.querySelector(`.thumbnail[data-view-name="${viewName}"]`);

        if (thumbnailToUpdate) {
                // ✅ Met à jour l'image du thumbnail existant
                thumbnailToUpdate.src = mockupUrl;
                thumbnailToUpdate.classList.remove("processing");

        } else {
                console.warn(`⚠️ Aucun thumbnail trouvé pour la vue ${viewName}, ajout en cours...`);

                // ✅ Création d'un nouveau thumbnail si aucun existant
                thumbnailToUpdate = document.createElement("img");
                thumbnailToUpdate.src = mockupUrl;
                thumbnailToUpdate.alt = `Mockup ${viewName}`;
                thumbnailToUpdate.classList.add("thumbnail");
                thumbnailToUpdate.dataset.viewName = viewName;
                if (mockup?.mockup_id) thumbnailToUpdate.dataset.styleId = mockup.mockup_id;

                // ⚡ Ajoute le gestionnaire de clic comme dans updateThumbnails
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

        // Conserve l'URL du mockup généré pour la création du produit
        if (productData && viewName === getFirstMockup(selectedVariant)?.view_name) {
                productData.mockup_url = mockupUrl;
                if (!window.generatedProductId && !window.productCreationPromise) {
                        window.productCreationPromise = window.createProduct(productData)
                                .catch(err => console.error('❌ Product creation failed:', err))
                                .finally(() => { window.productCreationPromise = null; });
                }
        }

        // ✅ Simuler un clic pour mettre à jour l'image principale
        if (viewName === getFirstMockup(selectedVariant)?.view_name || (window.currentMockup && window.currentMockup.view_name == viewName)) {
                thumbnailToUpdate.click();
        }

        if (currentLoadingOverlay) {
                currentLoadingOverlay.remove();
                currentLoadingOverlay = null;
        }
        if (overlayInterval) {
                clearInterval(overlayInterval);
                overlayInterval = null;
        }
}


function showNextGroup() {
        if ((currentGroupIndex + 1) * IMAGES_PER_GROUP >= bottomBarImages.length) return;
        currentGroupIndex++;
        renderCurrentGroup();
        updateArrows();
}

function showPreviousGroup() {
        if (currentGroupIndex === 0) return;
        currentGroupIndex--;
        renderCurrentGroup();
        updateArrows();
}

function updateArrows() {
        const left = document.querySelector('.bottom-bar .bottom-arrow.left');
        const right = document.querySelector('.bottom-bar .bottom-arrow.right');
        if (left) left.style.visibility = currentGroupIndex === 0 ? 'hidden' : 'visible';
        if (right) right.style.visibility = (currentGroupIndex + 1) * IMAGES_PER_GROUP >= bottomBarImages.length ? 'hidden' : 'visible';
}

document.addEventListener('DOMContentLoaded', () => {
        const left = document.querySelector('.bottom-bar .bottom-arrow.left');
        const right = document.querySelector('.bottom-bar .bottom-arrow.right');
        left?.addEventListener('click', showPreviousGroup);
        right?.addEventListener('click', showNextGroup);
});
