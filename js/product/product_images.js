
var mockupUtils = window.mockupUtils || {};
var buildProductData = mockupUtils.buildProductData;
var getFirstMockup = mockupUtils.getFirstMockup;
var updateMockupThumbnail = mockupUtils.updateMockupThumbnail;

window.currentProductId = window.currentProductId || null;
window.generatedProductId = window.generatedProductId || null;
window.productCreationPromise = window.productCreationPromise || null;
window.currentLoadingOverlay = window.currentLoadingOverlay || null;
window.overlayInterval = window.overlayInterval || null;

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
let mockupCooldownUntil = 0;
let cooldownInterval = null;
const overlayMessages = [
    "\uD83D\uDCE6 Pr\u00E9paration du mockup...",
    "\uD83C\uDFA8 Mise en place du design...",
    "\uD83D\uDDBC\uFE0F Construction de l'aper\u00E7u...",
    "\uD83D\uDE80 Finalisation..."
];
let overlayIndex = 0;

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

window.displayImagesInBottomBar = displayImagesInBottomBar;

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

                // ✅ Ajout du clic pour générer un mockup
                imgElement.addEventListener("click", function () {
                        // Démarre le chronomètre au clic sur l'image
                        mockupTimes.pending = Date.now();

                        const mockupData = {
                                image_url: image.image_url,
                                product_id: window.currentProductId || null,
                                variant_id: window.selectedVariant?.variant_id || null,
                                placement: window.selectedVariant?.placement || null,
                                technique: window.selectedVariant?.technique || null,
                                width: window.selectedVariant?.print_area_width || null,
                                height: window.selectedVariant?.print_area_height || null,
                                left: 0,
                                top: 0
                        };
                        console.log('🖼️ Image selected for mockup', mockupData);
                        generateMockup(mockupData); // 🚀 Envoi du vrai objet complet
                });


		contentDiv.appendChild(imgElement);
	});

        // Ajoute un petit effet de défilement pour montrer que la barre est scrollable
        contentDiv.scrollLeft = 0;
}


async function generateMockup(mockupData) {
        // Stocke les données pour la création du produit
        buildProductData(mockupData);

        console.log('📤 Preparing mockup request', mockupData);

        if (Date.now() < mockupCooldownUntil) {
                const remain = Math.ceil((mockupCooldownUntil - Date.now()) / 1000);
                showRateLimitMessage(remain);
                return;
        }

        if (!mockupData || !window.selectedVariant?.mockups?.length) {
                console.error("❌ Données insuffisantes pour générer un mockup.");
                alert("Impossible de générer le mockup. Données manquantes.");
                return;
        }

        const mainProductImage = document.getElementById("product-main-image");

        // Mesure du temps écoulé depuis le clic
        const requestStart = Date.now();
        if (mockupTimes.pending) {
                const delay = ((requestStart - mockupTimes.pending) / 1000).toFixed(1);
                console.log(`⌛ Request sent after ${delay}s`);
        }
        mockupTimes.requestSent = requestStart;

        document.querySelectorAll('.thumbnail').forEach(el => el.classList.add("processing"));
        mainProductImage?.classList.add("loading");

        let loadingOverlay = document.querySelector(".loading-overlay");
        if (!loadingOverlay) {
                loadingOverlay = document.createElement("div");
                loadingOverlay.classList.add("loading-overlay");
                loadingOverlay.innerHTML = `<div class="loading-spinner"></div><div class="loading-text">${overlayMessages[0]}</div>`;
                mainProductImage?.parentNode.appendChild(loadingOverlay);
        } else {
                const textEl = loadingOverlay.querySelector('.loading-text');
                if (textEl) textEl.textContent = overlayMessages[0];
        }
        window.currentLoadingOverlay = loadingOverlay;
        overlayIndex = 0;
        if (window.overlayInterval) clearInterval(window.overlayInterval);
        window.overlayInterval = setInterval(() => {
                const textEl = loadingOverlay.querySelector('.loading-text');
                if (!textEl) return;
                if (overlayIndex + 1 < overlayMessages.length) {
                        overlayIndex++;
                        textEl.textContent = overlayMessages[overlayIndex];
                } else {
                        clearInterval(window.overlayInterval);
                        window.overlayInterval = null;
                }
        }, 4000);

        let imageBase64 = '';
        try {
                const response = await fetch(mockupData.image_url);
                const blob = await response.blob();
                imageBase64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                });
        } catch (err) {
                console.error('❌ Conversion base64 échouée :', err);
                alert("Impossible de charger l'image sélectionnée.");
                return;
        }

        const form = new FormData();
        form.append("action", "generate_mockup");
        form.append("image_base64", imageBase64);
        form.append("variant_id", mockupData.variant_id);
        form.append("width", mockupData.width);
        form.append("height", mockupData.height);
        form.append("left", mockupData.left);
        form.append("top", mockupData.top);

        const firstViewName = getFirstMockup(window.selectedVariant)?.view_name;

        fetch("/wp-admin/admin-ajax.php", { method: "POST", body: form })
                .then(res => res.json())
                .then(data => {
                        console.log('📥 Mockup response', data);

                        if (data.success && Array.isArray(data.data?.files)) {
                                mockupTimes.pending = null;
                                data.data.files.forEach(f => updateMockupThumbnail(f.name, f.url));
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

window.generateMockup = generateMockup;

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
