function enableImageEnlargement() {
	// D'abord retirer l'ancien event listener si présent
	document.removeEventListener('click', handleImageClick);

	// Puis ajouter le nouvel event listener
	document.addEventListener('click', handleImageClick);
}

// Séparer ta fonction de clic proprement
function handleImageClick(event) {

	const image = event.target.closest('img.preview-enlarge');
	if (!image) return;

	// Sélection active ➔ charger dans le cropper
	if (typeof isSelectingImage !== 'undefined' && isSelectingImage) {
		console.log("✅ Mode sélection actif ➔ Insert dans cropper");

		const src = image.getAttribute('src');

		showElement('modalChoixImage'); // Ouvrir crop modal

		resetCropper();
		setImagePreview(src, function() {
			initializeCropper();
		});

		isSelectingImage = false;

		// Pas d'openImageOverlay
		return;
	}

	// Mode normal : ouvrir l'overlay
        const src = image.getAttribute('src');
        const username = image.getAttribute('data-display_name') || 'Inconnu';
        const userId = image.getAttribute('data-user-id') || 'Inconnu';
        const formatImage = image.getAttribute('data-format-image') || 'Inconnu';
        let rawPrompt = image.getAttribute('data-prompt');
        if (rawPrompt) {
                try {
                        const obj = JSON.parse(rawPrompt);
                        rawPrompt = obj.text || obj.prompt || rawPrompt;
                } catch (e) {
                        // keep rawPrompt as is
                }
        } else {
                rawPrompt = 'Aucun prompt disponible';
        }

        const prompt = rawPrompt;

	openImageOverlay(src, userId, username, formatImage, prompt);
}



function openImageOverlay(src, userId, username, formatImage, prompt) {
	const displayOnlyFormats = ['1:1', '3:4', '4:3', '16:9', '9:16'];

	const overlay = document.createElement('div');
	overlay.classList.add('preview-overlay');

	const mainContainer = document.createElement('div');
	mainContainer.classList.add('preview-main-container');

	const imageContainer = document.createElement('div');
	imageContainer.classList.add('preview-image-container');

	const enlargedImg = document.createElement('img');
	enlargedImg.setAttribute('src', src);
	enlargedImg.classList.add('preview-enlarged-img');

	const infoContainer = document.createElement('div');
	infoContainer.classList.add('preview-info-container');

	// -------- Partie utilisateur --------
	const userContainer = document.createElement('div');
	userContainer.classList.add('user-container');
	const userIcon = document.createElement('div');
	userIcon.classList.add('user-icon');

	const userLogoURL = `/wp-sauvegarde/user/${userId}/user_logo.png?t=${Date.now()}`;
	const imgTest = new Image();
	imgTest.src = userLogoURL;
	imgTest.onload = () => {
		userIcon.style.backgroundImage = `url(${userLogoURL})`;
		userIcon.style.backgroundSize = 'cover';
		userIcon.style.backgroundPosition = 'center';
	};
	imgTest.onerror = () => {
		userIcon.textContent = username.charAt(0).toUpperCase();
	};

	const userLoginLink = document.createElement('a');
	userLoginLink.href = `/communaute?user=${username}`;
	userLoginLink.target = '_blank';
	userLoginLink.textContent = username;
	userLoginLink.classList.add('user-login-link');

	userContainer.appendChild(userIcon);
	userContainer.appendChild(userLoginLink);

	// -------- Partie prompt --------
	const promptContainer = document.createElement('div');
	promptContainer.classList.add('prompt-container');

	const promptTitleContainer = document.createElement('div');
	promptTitleContainer.classList.add('prompt-title-container');

	const promptTitle = document.createElement('span');
	promptTitle.textContent = 'Prompt';
	promptTitle.classList.add('prompt-title');

	const copyPromptButton = document.createElement('button');
	copyPromptButton.innerHTML = '<i class="fas fa-copy"></i> Copier';
	copyPromptButton.classList.add('copy-button');

	const copyConfirmation = document.createElement('div');
	copyConfirmation.textContent = 'Copié !';
	copyConfirmation.classList.add('copy-confirmation');
	copyConfirmation.style.display = 'none';

	copyPromptButton.addEventListener('click', (event) => {
		event.stopPropagation();
		navigator.clipboard.writeText(prompt).then(() => {
			copyConfirmation.style.display = 'block';
			setTimeout(() => copyConfirmation.style.display = 'none', 2000);
		});
	});

	const promptTextElement = document.createElement('div');
	promptTextElement.textContent = prompt;
	promptTextElement.classList.add('prompt-text');

	promptTitleContainer.appendChild(promptTitle);
	promptTitleContainer.appendChild(copyPromptButton);
	promptTitleContainer.appendChild(copyConfirmation);
	promptContainer.appendChild(promptTitleContainer);
	promptContainer.appendChild(promptTextElement);

	// -------- Zone format --------
	const formatContainer = document.createElement('div');
	formatContainer.classList.add('format-container');

	const formatTitleContainer = document.createElement('div');
	formatTitleContainer.classList.add('format-title-container');

	const formatTitle = document.createElement('span');
	formatTitle.textContent = 'Format';
	formatTitle.classList.add('format-title');

	const formatTextElement = document.createElement('div');
	formatTextElement.classList.add('format-text');

	formatTitleContainer.appendChild(formatTitle);
	formatContainer.appendChild(formatTitleContainer);
	formatContainer.appendChild(formatTextElement);


	// -------- Boutons --------
	const usePromptButton = document.createElement('button');
	usePromptButton.textContent = 'Utiliser ce prompt';
	usePromptButton.classList.add('use-button');
	usePromptButton.addEventListener('click', () => {
		window.open(`/customize?prompt=${encodeURIComponent(prompt)}`, '_blank');
	});

	const useImageButton = document.createElement('button');
	useImageButton.textContent = 'Utiliser cette image';
	useImageButton.classList.add('use-button');
	useImageButton.disabled = true;

	const useContainer = document.createElement('div');
	useContainer.classList.add('use-container');
	useContainer.appendChild(usePromptButton);
	useContainer.appendChild(useImageButton);

	// -------- Fermeture --------
	const closeButton = document.createElement('button');
	closeButton.classList.add('close-button');
	closeButton.innerHTML = '&times;'; // caractère × simple et universel
	closeButton.addEventListener('click', () => {
		document.body.removeChild(overlay);
	});

	// -------- Assemblage DOM --------
	imageContainer.appendChild(enlargedImg);
	infoContainer.appendChild(userContainer);
	infoContainer.appendChild(promptContainer);
	infoContainer.appendChild(formatContainer);
	infoContainer.appendChild(useContainer);

	mainContainer.appendChild(closeButton);
	mainContainer.appendChild(imageContainer);
	mainContainer.appendChild(infoContainer);
	overlay.appendChild(mainContainer);
	document.body.appendChild(overlay);

	overlay.addEventListener('click', () => {
		document.body.removeChild(overlay);
	});
	mainContainer.addEventListener('click', (e) => {
		e.stopPropagation(); // ✅ empêche la fermeture au clic à l’intérieur
	});

	const isNeutral = displayOnlyFormats.includes(formatImage);

	if (isNeutral) {
		// ✅ Format "neutre" : afficher le ratio, mais permettre l'action
		formatTextElement.textContent = formatImage;

		useImageButton.disabled = true; // Désactivé pendant le chargement

		// Charger les produits compatibles
		fetch(`/wp-json/api/v1/products/format?format=${encodeURIComponent(formatImage)}`)
			.then(res => res.json())
			.then(data => {
			console.log("📦 [Neutral] API produits/format :", data);

			if (!data.success || data.choices.length === 0) {
				useImageButton.disabled = true;
				return;
			}

			const grouped = {};
			data.choices.forEach(choice => {
				if (!grouped[choice.product_id]) {
					grouped[choice.product_id] = {
						name: choice.product_name,
						variants: []
					};
				}
				grouped[choice.product_id].variants.push(choice);
			});

			const productIds = Object.keys(grouped);
			useImageButton.disabled = false;

			if (productIds.length === 1) {
				const { name, variants } = grouped[productIds[0]];

				useImageButton.addEventListener('click', () => {
					if (variants.length === 1) {
						const v = variants[0];
						redirectToConfigurator(name, v.product_id, src, prompt, formatImage, v.variant_id);
					} else {
						showProductChooserOverlay(variants, src, prompt, formatImage, name);
					}
				});
			} else {
				useImageButton.addEventListener('click', () => {
					const allVariants = Object.values(grouped).flatMap(p => p.variants);
					showProductChooserOverlay(allVariants, src, prompt, formatImage);
				});
			}
		})
			.catch(err => {
			console.error("❌ Erreur chargement produits compatibles :", err);
			useImageButton.disabled = true;
		});
	}

	else {
		// ❌ On n'affiche rien en attendant — on va charger un produit
		formatTextElement.textContent = ''; // vide volontairement

		fetch(`/wp-json/api/v1/products/format?format=${encodeURIComponent(formatImage)}`)
			.then(res => res.json())
			.then(data => {
			console.log("📦 API produits/format :", data);

			if (!data.success || data.choices.length === 0) {
				formatTextElement.textContent = "Aucun produit trouvé.";
				useImageButton.disabled = true;
				return;
			}

			// Groupe les choix par produit
			const grouped = {};
			data.choices.forEach(choice => {
				if (!grouped[choice.product_id]) {
					grouped[choice.product_id] = {
						name: choice.product_name,
						variants: []
					};
				}
				grouped[choice.product_id].variants.push(choice);
			});

			const productIds = Object.keys(grouped);
			if (productIds.length === 1) {
				// ✅ Un seul produit → choisir parmi ses variantes
				const { name, variants } = grouped[productIds[0]];
				formatTextElement.textContent = name;

				useImageButton.disabled = false;
				useImageButton.addEventListener('click', () => {
					if (variants.length === 1) {
						const v = variants[0];
						redirectToConfigurator(name, v.product_id, src, prompt, formatImage, v.variant_id);
					} else {
						showProductChooserOverlay(variants, src, prompt, formatImage, name);
					}
				});
			} else {
				// ✅ Plusieurs produits → afficher sélecteur produit + variante
				useImageButton.disabled = false;
				useImageButton.addEventListener('click', () => {
					const allVariants = Object.values(grouped).flatMap(p => p.variants);
					showProductChooserOverlay(allVariants, src, prompt, formatImage);
				});
			}
		});
	}


}
function redirectToConfigurator(name, id, src, prompt, format, variantId) {
	const url = new URL("/configurateur", window.location.origin);
	url.searchParams.set("nom", name);
	url.searchParams.set("id", id);
	url.searchParams.set("variant", variantId);
	url.searchParams.set("image_url", src);
	url.searchParams.set("mockup", "1");
	window.location.href = url.toString();
}

function showProductChooserOverlay(choices, src, prompt, format, productNameOverride = null) {
	const colorTranslations = {
		black: "Noir",
		white: "Blanc",
	};

	console.log("🧩 [Overlay] Affichage des variantes compatibles :");
	console.table(choices.map(choice => ({
		variant_id: choice.variant_id,
		product_id: choice.product_id,
		name: choice.product_name,
		size: choice.variant_size,
		color: choice.color,
		ratio: choice.ratio_image
	})));

	const overlay = document.createElement('div');
	overlay.classList.add('product-chooser-overlay');

	const box = document.createElement('div');
	box.classList.add('product-chooser-box');

	const title = document.createElement('h3');
	title.textContent = "Choisissez une variante";
	box.appendChild(title);

	choices.forEach(choice => {
		const btn = document.createElement('button');
		btn.classList.add('product-choice-button');

		const displayName = productNameOverride || choice.product_name;
		const translatedColor = choice.color ? (colorTranslations[choice.color.toLowerCase()] || choice.color) : "";
		const label = `${displayName} – ${choice.variant_size || "?"}${translatedColor ? " – " + translatedColor : ""}`;
		btn.textContent = label;

		btn.addEventListener('click', () => {
			redirectToConfigurator(displayName, choice.product_id, src, prompt, format, choice.variant_id);
		});

		box.appendChild(btn);
	});

	const closeBtn = document.createElement('button');
	closeBtn.textContent = "Fermer";
	closeBtn.classList.add('close-choice-button');
	closeBtn.addEventListener('click', () => document.body.removeChild(overlay));

	box.appendChild(closeBtn);
	overlay.appendChild(box);
	document.body.appendChild(overlay);
}

