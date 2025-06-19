let productData = null;

const BOTTOM_IMAGES_PER_PAGE = 12;
let bottomBarImages = [];
let bottomBarPage = 0;

// Timestamp de début de génération des mockups
let mockupGenerationStart = null;

// Création de l'info-bulle globale
const tooltip = document.createElement("div");
tooltip.classList.add("dynamic-tooltip");
tooltip.innerText = "Preview this design on the product";
document.body.appendChild(tooltip);

// Affichage des images et ajout du clic pour générer un mockup
function displayImagesInBottomBar(images) {
        const contentDiv = document.querySelector(".bottom-bar .bottom-images");
        const prevBtn = document.querySelector(".bottom-bar .bottom-prev");
        const nextBtn = document.querySelector(".bottom-bar .bottom-next");

        if (!contentDiv) {
                console.error("❌ Erreur : Impossible de trouver .bottom-bar .bottom-images");
                return;
        }

        bottomBarImages = images || [];
        bottomBarPage = 0;

        if (prevBtn && nextBtn) {
                prevBtn.onclick = () => {
                        if (bottomBarPage > 0) {
                                bottomBarPage--;
                                renderBottomBarPage();
                        }
                };

                nextBtn.onclick = () => {
                        if ((bottomBarPage + 1) * BOTTOM_IMAGES_PER_PAGE < bottomBarImages.length) {
                                bottomBarPage++;
                                renderBottomBarPage();
                        }
                };
        }

        renderBottomBarPage();
}

function renderBottomBarPage() {
        const contentDiv = document.querySelector(".bottom-bar .bottom-images");
        const prevBtn = document.querySelector(".bottom-bar .bottom-prev");
        const nextBtn = document.querySelector(".bottom-bar .bottom-next");

        if (!contentDiv) {
                console.error("❌ Erreur : Impossible de trouver .bottom-bar .bottom-images");
                return;
        }

        contentDiv.innerHTML = "";

        const start = bottomBarPage * BOTTOM_IMAGES_PER_PAGE;
        const pageImages = bottomBarImages.slice(start, start + BOTTOM_IMAGES_PER_PAGE);

        pageImages.forEach(image => {
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
				product_id: currentProductId || null,
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

        if (prevBtn) prevBtn.disabled = bottomBarPage === 0;
        if (nextBtn) nextBtn.disabled = (bottomBarPage + 1) * BOTTOM_IMAGES_PER_PAGE >= bottomBarImages.length;
}


function generateMockup(mockupData) {
        if (!mockupData || !selectedVariant?.mockups?.length) {
                console.error("❌ Données insuffisantes pour générer un mockup.");
                alert("Impossible de générer le mockup. Données manquantes.");
                return;
        }

	const styleIds = selectedVariant.mockups.map(m => m.mockup_id);
	const primaryStyleId = styleIds[0];
	let productDataCreated = false;
        const mainProductImage = document.getElementById("product-main-image");

        // Démarre le chronomètre pour mesurer l'affichage des mockups
        mockupGenerationStart = performance.now();

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

        // Fonction de polling du statut des mockups
        async function pollMockupStatus(taskId, styleId, attempt = 0) {
                try {
                        const res = await fetch(`/wp-json/api/v1/mockups/status/${taskId}`);
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        const data = await res.json();
                        if (data.status === 'completed' && data.mockup_url) {
                                console.log(`✅ Mockup terminé pour style ${styleId}`);
                                updateMockupThumbnail(styleId, data.mockup_url);

                                if (styleId === primaryStyleId && !productDataCreated) {
                                        productData = buildProductData({
                                                ...mockupData,
                                                generated_mockup_url: data.mockup_url
                                        });
                                        productDataCreated = true;
                                }
                                return;
                        }
                        if (data.status === 'failed') {
                                console.error(`❌ Tâche ${taskId} échouée :`, data.error);
                                return;
                        }
                } catch (err) {
                        console.error(`❌ Polling erreur tâche ${taskId} :`, err.message);
                }

                if (attempt < 60) {
                        setTimeout(() => pollMockupStatus(taskId, styleId, attempt + 1), 2000);
                }
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
                        if (data.success && data.data?.task_id) {
                                console.log(`🆗 Tâche ${data.data.task_id} lancée pour style ${styleId}`);
                                pollMockupStatus(data.data.task_id, styleId);
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
                        }, index * 500); // 500ms d'écart
                });
                mockupPromises.push(promise);
        });

	// Nettoyage une fois toutes les promesses terminées
        Promise.all(mockupPromises).then(() => {
                const durationSeconds = ((performance.now() - (mockupGenerationStart || performance.now())) / 1000).toFixed(2);
                console.log(`✅ Tous les mockups sont terminés en ${durationSeconds}s.`);

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


function updateMockupThumbnail(styleId, mockupUrl) {
        console.log(`🔄 Mise à jour du thumbnail pour le style ${styleId}`);

        if (mockupGenerationStart) {
                const elapsedSeconds = ((performance.now() - mockupGenerationStart) / 1000).toFixed(2);
                console.log(`⏱️ Thumbnail style ${styleId} affiché après ${elapsedSeconds}s`);

        }

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

                thumbnailsContainer.appendChild(thumbnailToUpdate);
                console.log(`✅ Nouveau thumbnail ajouté pour style ${styleId}`);
        }

       // 🔄 Met à jour les données du variant pour conserver le thumbnail
       if (selectedVariant && Array.isArray(selectedVariant.mockups)) {
               const existing = selectedVariant.mockups.find(m => m.mockup_id == styleId);
               if (existing) {
                       existing.mockup_image = mockupUrl;
               } else {
                       selectedVariant.mockups.push({ mockup_id: styleId, mockup_image: mockupUrl });
               }

               if (currentProductId && window.customizerCache?.variants?.[currentProductId]?.variants) {
                       const productVariants = window.customizerCache.variants[currentProductId].variants;
                       const cachedVar = productVariants.find(v => v.variant_id == selectedVariant.variant_id);
                       if (cachedVar) {
                               cachedVar.mockups = selectedVariant.mockups;
                               if (typeof window.persistCustomizerCache === 'function') {
                                       window.persistCustomizerCache();
                               } else {
                                       try {
                                               const storage = window.localStorage || window.sessionStorage;
                                               const tmp = { ...window.customizerCache, models: {} };
                                               storage.setItem('customizerCache', JSON.stringify(tmp));
                                       } catch (e) {}
                               }
                       }
               }
       }

        // ✅ Simuler un clic pour mettre à jour l'image principale
        console.log(`🔄 Activation automatique du thumbnail pour style ${styleId}`);
        if (styleId === selectedVariant.mockups[0]?.mockup_id) {
                console.log(`🔄 Activation automatique du thumbnail principal (style ${styleId})`);
		thumbnailToUpdate.click();
	}
}

