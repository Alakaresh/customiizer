// Nouveau show_ratio.js - gestion du mode 'ratio' + ajout de la gestion 'produit' et 'variant' + appel loadImages() au clic sur variant avec logs

let selectedRatio = '1:1';
let selectedProduct = '';

let globalProducts = [];

document.addEventListener('DOMContentLoaded', function () {
	logger.log('[Init] DOM entièrement chargé');
	loadProductData();
	addRatioButtonsEventListeners();
});

function toggleRatioMenu() {
	const ratioMenu = document.getElementById('ratio-menu');
	const arrowIcon = document.getElementById('arrow-icon');

	const isMenuOpen = ratioMenu && ratioMenu.style.display === 'block';
	if (ratioMenu) {
		ratioMenu.style.display = isMenuOpen ? 'none' : 'block';
		logger.log(`[Menu] Ratio menu ${isMenuOpen ? 'fermé' : 'ouvert'}`);
	}
	if (arrowIcon) {
		arrowIcon.classList.toggle('open', !isMenuOpen);
	}
}

function addRatioButtonsEventListeners() {
	document.querySelectorAll('.ratio-button').forEach(button => {
		button.addEventListener('click', function () {
			clearAllSelections();
			selectedRatio = this.getAttribute('data-ratio');
			selectedProduct = '';
			logger.log(`[Ratio] Bouton sélectionné : ${selectedRatio}`);
			if (typeof loadImages === 'function') {
				logger.log('[loadImages] Appelé après sélection ratio');
				loadImages();
			}
			document.getElementById('selected-info').textContent = selectedRatio;
		});
	});
}

function addProductButtons(products) {
	const container = document.getElementById('product-container');
	if (!container) return;
	container.innerHTML = '';

	const displayed = new Set();
	products.forEach(product => {
		const key = product.product_name.includes("Clear Case") ? "Clear Case" : product.product_name;
		if (!displayed.has(key)) {
			displayed.add(key);
			if (key === "Clear Case") return;

			const btn = document.createElement('button');
			btn.className = 'toggle-button format-button';
			btn.textContent = product.product_name;
			btn.addEventListener('click', () => {
				clearAllSelections();
				selectedProduct = product.product_id;
				selectedRatio = '';
				logger.log(`[Produit] Bouton cliqué pour : ${key}`);
				displayVariantsForProduct(key);
				document.getElementById('selected-info').textContent = product.product_name;
			});
			container.appendChild(btn);
		}
	});
}

function loadProductData() {
	logger.log('[Data] Chargement des produits...');
	jQuery.ajax({
		url: ajaxurl,
		method: 'POST',
		data: { action: 'get_product_ratios' },
		success: function (products) {
			if (Array.isArray(products)) {
				globalProducts = products;
				logger.log(`[Data] ${products.length} produits reçus`);
				logger.log(`products`,products);
				addProductButtons(products);
			} else {
				console.error('[Erreur] Réponse invalide :', products);
			}
		},
		error: function (err) {
			console.error('[Erreur AJAX] :', err);
		}
	});
}

function isValidMockupImage(path) {
	return typeof path === 'string' && path.includes('MKP_1');
}

function displayVariantsForProduct(normalizedName) {
	const container = document.getElementById('product-groups-container');
	if (!container) return;
	container.innerHTML = '';

	const filtered = globalProducts.filter(v => (v.product_name.includes("Clear Case") ? "Clear Case" : v.product_name) === normalizedName && isValidMockupImage(v.image));
	logger.log(`[Filtrage] ${filtered.length} variantes trouvées pour ${normalizedName}`);

	filtered.forEach(variant => {
		const item = document.createElement('div');
		item.className = 'product-item';

		const image = document.createElement('img');
		image.src = variant.image;
		image.alt = variant.product_name.includes("Clear Case") ? '' : variant.size;
		item.appendChild(image);

		if (!variant.product_name.includes("Clear Case")) {
			const sizeText = document.createElement('p');
			sizeText.textContent = variant.size;
			item.appendChild(sizeText);
		}

		item.addEventListener('click', () => {
			highlightSelection(item);
			selectedVariant = variant.variant_id;
			logger.log(`[Sélection] Variante sélectionnée : ${variant.size}`);
			selectedRatio = variant.ratio_image ? variant.ratio_image : '';
			logger.log(`[Update] selectedRatio mis à jour avec : ${selectedRatio}`);

			if (typeof loadImages === 'function') {
				logger.log('[loadImages] Appelé après sélection variant');
				loadImages();
			}
		});

		container.appendChild(item);
	});
	// ✅ Sélection automatique de la première variante si elle existe
	const firstItem = container.querySelector('.product-item');
	if (firstItem) {
		logger.log('[AutoSélection] Première variante sélectionnée automatiquement');
		firstItem.click();
	}

}

function highlightSelection(selectedElement) {
	document.querySelectorAll('.product-item').forEach(el => {
		el.classList.remove('selected');
	});
	selectedElement.classList.add('selected');
	logger.log('[UI] Mise en surbrillance de la sélection');
}

function clearAllSelections() {
	document.querySelectorAll('.product-item.selected').forEach(el => {
		el.classList.remove('selected');
	});
	logger.log('[UI] Sélections précédentes effacées');
}
