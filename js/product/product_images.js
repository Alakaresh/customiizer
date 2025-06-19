let productData = null;
window.currentProductId = window.currentProductId || null;

// Gestion des groupes d'images de la bottom-bar
const IMAGES_PER_GROUP = 12;
let bottomBarImages = [];
let currentGroupIndex = 0;

function getLatestMockup(variant) {
    return variant.mockups.slice().sort((a, b) => a.mockup_id - b.mockup_id).pop();
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
	if (!mockupData || !selectedVariant?.mockups?.length) {
		console.error("❌ Données insuffisantes pour générer un mockup.");
		alert("Impossible de générer le mockup. Données manquantes.");
		return;
	}

        const styleIds = selectedVariant.mockups.map(m => m.mockup_id);
        const primaryStyleId = styleIds.sort((a,b) => a - b).slice(-1)[0];
	let productDataCreated = false;
	const mainProductImage = document.getElementById("product-main-image");

	// Préparation UI
	document.querySelectorAll('.thumbnail').forEach(el => el.classList.add("processing"));
	mainProductImage?.classList.add("loading");

	let loadingOverlay = document.querySelector(".loading-overlay");
	if (!loadingOverlay) {
		loadingOverlay = document.createElement("div");
		loadingOverlay.classList.add("loading-overlay");
		loadingOverlay.innerHTML = `<div class="loading-spinner"></div><div class="loading-text">📦 Préparation...</div>`;
		mainProductImage?.parentNode.appendChild(loadingOverlay);
	}

	// Fonction d'envoi avec retry
	const sendWithRetry = async (styleId, attempt = 0) => {
		const form = new FormData();
		form.append("action", "generate_mockup");
		form.append("image_url", mockupData.image_url);
		form.append("product_id", mockupData.product_id);
		form.append("variant_id", mockupData.variant_id);
		form.append("style_id", styleId);
		form.append("placement", mockupData.placement);
		form.append("technique", mockupData.technique);
		form.append("width", mockupData.width);
		form.append("height", mockupData.height);
		form.append("left", mockupData.left);
		form.append("top", mockupData.top);

		try {
			const res = await fetch("/wp-admin/admin-ajax.php", { method: "POST", body: form });
			if (res.status === 429) {
				if (attempt < 3) {
					const wait = 1500 + attempt * 1000;
					console.warn(`⏳ 429 reçu pour style ${styleId} — retry dans ${wait}ms`);
					await new Promise(r => setTimeout(r, wait));
					return sendWithRetry(styleId, attempt + 1);
				}
				throw new Error("Trop de requêtes (429). Abandon.");
			}

			const data = await res.json();
			if (data.success && data.data?.mockup_url) {
				console.log(`✅ Mockup reçu pour style ${styleId}`);
				updateMockupThumbnail(styleId, data.data.mockup_url);

				if (styleId === primaryStyleId && !productDataCreated) {
					productData = buildProductData({
						...mockupData,
						generated_mockup_url: data.data.mockup_url
					});
					productDataCreated = true;
				}
			} else {
				throw new Error(data.message || "Erreur inconnue");
			}
		} catch (err) {
			console.error(`❌ Échec pour style ${styleId} :`, err.message);
		}
	};

	// Envoi avec délai + promesse par style
	const mockupPromises = [];

	styleIds.forEach((styleId, index) => {
		const promise = new Promise(resolve => {
			setTimeout(() => {
				sendWithRetry(styleId).then(resolve);
			}, index * 1000); // 1s d'écart
		});
		mockupPromises.push(promise);
	});

	// Nettoyage une fois toutes les promesses terminées
	Promise.all(mockupPromises).then(() => {
		console.log("✅ Tous les mockups sont terminés.");
		document.querySelectorAll('.thumbnail').forEach(el => el.classList.remove("processing"));
		mainProductImage?.classList.remove("loading");
		loadingOverlay?.remove();
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

	// ✅ Simuler un clic pour mettre à jour l'image principale
	console.log(`🔄 Activation automatique du thumbnail pour style ${styleId}`);
        if (styleId === getLatestMockup(selectedVariant)?.mockup_id) {
                console.log(`🔄 Activation automatique du thumbnail principal (style ${styleId})`);
                thumbnailToUpdate.click();
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
