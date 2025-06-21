let productData = null;
window.currentProductId = window.currentProductId || null;

// Gestion des groupes d'images de la bottom-bar
const IMAGES_PER_GROUP = 12;
let bottomBarImages = [];
let currentGroupIndex = 0;
// Partage d'un objet global pour suivre les temps de génération
window.mockupTimes = window.mockupTimes || {};
const mockupTimes = window.mockupTimes;
// Stocke temporairement le dernier clic avant l'appel à generateMockup
mockupTimes.pending = null;
let currentLoadingOverlay = null;

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

		console.log("image :",image);
		// ✅ Ajout du clic pour générer un mockup
                imgElement.addEventListener("click", function () {
                        // Démarre le chronomètre au clic sur l'image
                        mockupTimes.pending = Date.now();
                        console.log("[Timer] 📸 Clic sur l'image pour mockup");

                        const mockupData = {
                                image_url: image.image_url,
                                product_id: window.currentProductId || null,
                                variant_id: selectedVariant?.variant_id || null,
                                placement: selectedVariant?.placement || null,
                                technique: selectedVariant?.technique || null,
				width: selectedVariant?.print_area_width || null,
				height: selectedVariant?.print_area_height || null,
				left: 0, 
				top: 0    
			};
                        generateMockup(mockupData); // 🚀 Envoi du vrai objet complet
                });


		contentDiv.appendChild(imgElement);
	});

        // Ajoute un petit effet de défilement pour montrer que la barre est scrollable
        contentDiv.scrollLeft = 0;
}


function generateMockup(mockupData) {
        // Stocke les données pour la création du produit
        productData = buildProductData(mockupData);

        if (!mockupData || !selectedVariant?.mockups?.length) {
                console.error("❌ Données insuffisantes pour générer un mockup.");
                alert("Impossible de générer le mockup. Données manquantes.");
                return;
        }

        const styleIds = selectedVariant.mockups.map(m => m.mockup_id);
        const mainProductImage = document.getElementById("product-main-image");

        // Mesure du temps écoulé depuis le clic
        const requestStart = Date.now();
        if (mockupTimes.pending) {
                const delay = ((requestStart - mockupTimes.pending) / 1000).toFixed(1);
                console.log(`[Timer] 🚀 Requête envoyée ${delay}s après le clic`);
        }

        document.querySelectorAll('.thumbnail').forEach(el => el.classList.add("processing"));
        mainProductImage?.classList.add("loading");

        let loadingOverlay = document.querySelector(".loading-overlay");
        if (!loadingOverlay) {
                loadingOverlay = document.createElement("div");
                loadingOverlay.classList.add("loading-overlay");
                loadingOverlay.innerHTML = `<div class="loading-spinner"></div><div class="loading-text">📦 Préparation...</div>`;
                mainProductImage?.parentNode.appendChild(loadingOverlay);
        }
        currentLoadingOverlay = loadingOverlay;

        const form = new FormData();
        form.append("action", "generate_mockup");
        form.append("image_url", mockupData.image_url);
        form.append("product_id", mockupData.product_id);
        form.append("variant_id", mockupData.variant_id);
        form.append("placement", mockupData.placement);
        form.append("technique", mockupData.technique);
        form.append("width", mockupData.width);
        form.append("height", mockupData.height);
        form.append("left", mockupData.left);
        form.append("top", mockupData.top);
        form.append("style_ids", JSON.stringify(styleIds));

        fetch("/wp-admin/admin-ajax.php", { method: "POST", body: form })
                .then(res => res.json())
                .then(data => {
                        if (data.success && data.data?.task_id) {
                                const taskId = data.data.task_id;
                                const now = Date.now();
                                mockupTimes[taskId] = {
                                        click: mockupTimes.pending || requestStart,
                                        request: requestStart,
                                        taskCreated: now
                                };
                                const delay = ((now - mockupTimes[taskId].click) / 1000).toFixed(1);
                                console.log(`✅ Tâche Printful ${taskId} créée après ${delay}s depuis le clic`);
                                mockupTimes.pending = null;
                                pollMockupStatus(taskId);
                        } else {
                                console.error("❌ Erreur création tâche :", data.message);
                                if (typeof data.retry_after !== "undefined") {
                                        alert(`Limite atteinte, réessayez dans ${data.retry_after} secondes.`);
                                } else {
                                        alert("Erreur lors de la création du mockup: " + data.message);
                                }
                        }
                })
                .catch(err => {
                        console.error("❌ Erreur réseau :", err.message);
                })
                .finally(() => {
                        document.querySelectorAll('.thumbnail').forEach(el => el.classList.remove("processing"));
                        mainProductImage?.classList.remove("loading");
                });
}

function buildProductData(mockupData) {
	const productName = jQuery('.product-name').text().trim();
	const productPrice = selectedVariant.price;

        const productData = {
                product_name: productName,
                product_price: productPrice,
                delivery_price: selectedVariant?.delivery_price,
                mockup_url: mockupData.generated_mockup_url || "",
                design_image_url: mockupData.image_url,
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

        console.log("✅ productData construit :", productData);
        return productData;
}

function cacheUpdatedMockup(styleId, mockupUrl) {
        if (!selectedVariant) return;

        let mockup = selectedVariant.mockups.find(m => m.mockup_id == styleId);
        if (mockup) {
                mockup.mockup_image = mockupUrl;
        } else {
                mockup = { mockup_id: styleId, mockup_image: mockupUrl, position_top: 0, position_left: 0 };
                selectedVariant.mockups.push(mockup);
        }

        const cache = window.customizerCache?.variants?.[window.currentProductId];
        if (cache && Array.isArray(cache.variants)) {
                const v = cache.variants.find(v => v.variant_id == selectedVariant.variant_id);
                if (v) {
                        let cachedMockup = v.mockups.find(m => m.mockup_id == styleId);
                        if (cachedMockup) {
                                cachedMockup.mockup_image = mockupUrl;
                        } else {
                                cachedMockup = { mockup_id: styleId, mockup_image: mockupUrl, position_top: 0, position_left: 0 };
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
                console.log('🔁 Re-cliquant sur le thumbnail sélectionné');
                activeThumb.click();
        }
}


function updateMockupThumbnail(styleId, mockupUrl) {
        console.log(`🔄 Mise à jour du thumbnail pour le style ${styleId}`);

	const thumbnailsContainer = document.querySelector(".image-thumbnails");
	if (!thumbnailsContainer) {
		console.error("❌ Impossible de trouver le conteneur des thumbnails !");
		return;
	}

        let thumbnailToUpdate = document.querySelector(`.thumbnail[data-style-id="${styleId}"]`);

        if (thumbnailToUpdate) {
                // ✅ Met à jour l'image du thumbnail existant
                thumbnailToUpdate.src = mockupUrl;
                thumbnailToUpdate.classList.remove("processing");
                console.log(`✅ Thumbnail mis à jour pour style ${styleId}`);

        } else {
		console.warn(`⚠️ Aucun thumbnail trouvé pour le style ${styleId}, ajout en cours...`);

                // ✅ Création d'un nouveau thumbnail si aucun existant
                thumbnailToUpdate = document.createElement("img");
                thumbnailToUpdate.src = mockupUrl;
                thumbnailToUpdate.alt = `Mockup Style ${styleId}`;
                thumbnailToUpdate.classList.add("thumbnail");
                thumbnailToUpdate.dataset.styleId = styleId;

                // ⚡ Ajoute le gestionnaire de clic comme dans updateThumbnails
                thumbnailToUpdate.addEventListener('click', function () {
                        const mainProductImage = document.getElementById('product-main-image');
                        if (!mainProductImage) return;
                        const mockup = { mockup_id: styleId, mockup_image: this.src, position_top: 0, position_left: 0 };
                        if (typeof currentMockup !== 'undefined') currentMockup = mockup;
                        window.currentMockup = mockup;
                        mainProductImage.src = this.src;
                        document.querySelectorAll('.image-thumbnails .thumbnail').forEach(el => el.classList.remove('selected'));
                        this.classList.add('selected');
                        if (window.jQuery) jQuery(document).trigger('mockupSelected', [typeof selectedVariant !== 'undefined' ? selectedVariant : window.selectedVariant, mockup]);
                });

                thumbnailsContainer.appendChild(thumbnailToUpdate);
                console.log(`✅ Nouveau thumbnail ajouté pour style ${styleId}`);
        }

        cacheUpdatedMockup(styleId, mockupUrl);

        // Conserve l'URL du mockup généré pour la création du produit
        if (productData) {
                productData.mockup_url = mockupUrl;
        }

	// ✅ Simuler un clic pour mettre à jour l'image principale
        console.log(`🔄 Activation automatique du thumbnail pour style ${styleId}`);
        if (styleId === getFirstMockup(selectedVariant)?.mockup_id) {
                console.log(`🔄 Activation automatique du premier thumbnail (style ${styleId})`);
                thumbnailToUpdate.click();
        } else if (window.currentMockup && window.currentMockup.mockup_id == styleId) {
                console.log(`🔄 Re-clic sur le thumbnail sélectionné (${styleId})`);
                thumbnailToUpdate.click();
        }

        if (currentLoadingOverlay) {
                currentLoadingOverlay.remove();
                currentLoadingOverlay = null;
        }
}

function pollMockupStatus(taskId, attempts = 0) {
        fetch(`/wp-json/customiizer/v1/mockup-status?task_id=${taskId}`)
                .then(res => res.json())
                .then(data => {
                        if (data.success && Array.isArray(data.mockups) && data.mockups.length) {
                                data.mockups.forEach(m => {
                                        updateMockupThumbnail(m.style_id, m.mockup_url);
                                });
                                if (mockupTimes[taskId]) {
                                        const now = Date.now();
                                        const total = ((now - mockupTimes[taskId].click) / 1000).toFixed(1);
                                        const postTask = ((now - mockupTimes[taskId].taskCreated) / 1000).toFixed(1);
                                        console.log(`⏱️ Mockup ${taskId} affiché après ${total}s (dont ${postTask}s après création de la tâche)`);
                                        delete mockupTimes[taskId];
                                        setTimeout(triggerSelectedThumbnail, 0);
                                }
                        } else if (attempts < 20) {
                                setTimeout(() => pollMockupStatus(taskId, attempts + 1), 3000);
                        } else {
                                if (currentLoadingOverlay) {
                                        currentLoadingOverlay.remove();
                                        currentLoadingOverlay = null;
                                }
                        }
                })
                .catch(() => {
                        if (attempts < 20) {
                                setTimeout(() => pollMockupStatus(taskId, attempts + 1), 3000);
                        } else {
                                if (currentLoadingOverlay) {
                                        currentLoadingOverlay.remove();
                                        currentLoadingOverlay = null;
                                }
                        }
                });
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
