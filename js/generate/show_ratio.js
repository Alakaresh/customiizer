// Nouveau show_ratio.js - gestion du mode 'ratio' + ajout de la gestion 'produit' et 'variant' + appel loadImages() au clic sur variant avec logs

const DEFAULT_RATIO = '1:1';
const DEFAULT_SUMMARY_IMAGE = 'https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png';
const SAVED_VARIANT_STORAGE_KEY = 'customiizerSavedVariant';
let selectedRatio = DEFAULT_RATIO;
let selectedProductKey = '';
let globalProducts = [];
let ratioFromQuery = '';

document.addEventListener('DOMContentLoaded', function () {
    ratioFromQuery = getRatioFromQueryParam();
    setDefaultSelectedInfo();
    loadProductData();
});

function getSavedVariantSelection() {
    try {
        const raw = localStorage.getItem(SAVED_VARIANT_STORAGE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        const variantId = parsed.variantId != null ? String(parsed.variantId) : '';
        if (!variantId) {
            return null;
        }

        return {
            variantId,
            productName: typeof parsed.productName === 'string' ? parsed.productName : '',
            ratio: typeof parsed.ratio === 'string' ? parsed.ratio : ''
        };
    } catch (error) {
        console.warn('[Ratio] Impossible de lire la variante enregistrée', error);
        return null;
    }
}

function clearSavedVariantSelection() {
    try {
        localStorage.removeItem(SAVED_VARIANT_STORAGE_KEY);
    } catch (error) {
        console.warn('[Ratio] Impossible de nettoyer la variante enregistrée', error);
    }
}

function tryRestoreVariantSelection(savedSelection, productEntries) {
    if (!savedSelection) {
        return false;
    }

    const variantId = savedSelection.variantId;
    if (!variantId) {
        clearSavedVariantSelection();
        return false;
    }

    const matchedVariant = globalProducts.find(variant => String(variant.variant_id) === variantId);
    if (!matchedVariant) {
        clearSavedVariantSelection();
        return false;
    }

    const normalizedProduct = normalizeProductName(matchedVariant.product_name);
    if (!normalizedProduct) {
        clearSavedVariantSelection();
        return false;
    }

    const productExists = productEntries.some(entry => entry.key === normalizedProduct);
    if (!productExists) {
        clearSavedVariantSelection();
        return false;
    }

    selectProduct(normalizedProduct, { variantIdToSelect: variantId });
    clearSavedVariantSelection();
    return true;
}

function getRatioFromQueryParam() {
    try {
        const params = new URLSearchParams(window.location.search);
        const raw = params.get('ratio');
        return raw ? raw.trim() : '';
    } catch (error) {
        console.error('[Ratio] Impossible de lire le paramètre ratio depuis l\'URL', error);
        return '';
    }
}

function toggleRatioMenu(forceState) {
    setVariantPanelVisibility(forceState);
}

function setVariantPanelVisibility(forceState) {
    const panel = document.getElementById('variant-display');
    const summary = document.getElementById('variant-summary');

    if (!panel) {
        return false;
    }

    const isCurrentlyHidden = panel.classList.contains('is-hidden');
    const shouldBeVisible =
        typeof forceState === 'boolean' ? forceState : isCurrentlyHidden;

    panel.classList.toggle('is-hidden', !shouldBeVisible);
    panel.setAttribute('aria-hidden', shouldBeVisible ? 'false' : 'true');

    if (summary) {
        summary.setAttribute('aria-expanded', shouldBeVisible ? 'true' : 'false');
    }

    toggleImageGrid(shouldBeVisible);

    return shouldBeVisible;
}

function setDefaultSelectedInfo() {
    const selectedInfo = document.getElementById('selected-info');
    if (!selectedInfo) {
        return;
    }

    const label = 'Sélectionnez un produit';
    selectedInfo.textContent = label;
    selectedInfo.setAttribute('title', label);

    updateVariantSummaryImage(DEFAULT_SUMMARY_IMAGE);
}

function clearSelectedVariantState() {
    selectedRatio = '';

    if (typeof selectedVariant !== 'undefined') {
        selectedVariant = null;
    }
    window.selectedVariant = null;

    highlightVariantSelection(null);
    updateVariantSummaryImage(DEFAULT_SUMMARY_IMAGE);

    if (typeof loadImages === 'function') {
        loadImages();
    }
}

function resetVariantSelection() {
    selectedProductKey = '';
    selectedRatio = DEFAULT_RATIO;

    if (typeof selectedVariant !== 'undefined') {
        selectedVariant = null;
    }
    window.selectedVariant = null;

    setDefaultSelectedInfo();
    setVariantPanelVisibility(false);
}

function getVariantContainers() {
    return Array.from(document.querySelectorAll('[data-variant-container]'));
}

function toggleImageGrid(isHidden) {
    const wrapper = document.getElementById('image-grid-wrapper');
    const placeholderGrid = document.getElementById('generation-placeholder-grid');
    const gallery = document.getElementById('generation-gallery');

    const hidden = Boolean(isHidden);

    if (wrapper) {
        wrapper.classList.toggle('is-hidden', hidden);
        wrapper.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    }

    if (placeholderGrid) {
        placeholderGrid.setAttribute(
            'aria-hidden',
            hidden ? 'true' : (placeholderGrid.classList.contains('is-hidden') ? 'true' : 'false')
        );
    }

    if (gallery) {
        gallery.setAttribute(
            'aria-hidden',
            hidden ? 'true' : (gallery.classList.contains('is-hidden') ? 'true' : 'false')
        );
    }
}

function hideVariantList() {
    const containers = getVariantContainers();

    if (containers.length === 0) {
        return;
    }

    containers.forEach(container => {
        container.classList.add('is-hidden');
        container.innerHTML = '';
        container.setAttribute('aria-busy', 'false');
    });

    toggleImageGrid(false);
}

function loadProductData() {
    jQuery.ajax({
        url: ajaxurl,
        method: 'POST',
        data: { action: 'get_product_ratios' },
        success: function (products) {
            if (Array.isArray(products)) {
                globalProducts = products;
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

function normalizeProductName(name) {
    if (typeof name !== 'string') {
        return '';
    }

    const trimmed = name.trim();
    if (trimmed.includes('Clear Case')) {
        return 'Clear Case';
    }

    return trimmed;
}

function buildProductEntries(products) {
    const entries = new Map();

    products.forEach(product => {
        const normalized = normalizeProductName(product.product_name);
        if (!normalized || normalized === 'Clear Case') {
            return;
        }

        if (!entries.has(normalized)) {
            entries.set(normalized, {
                key: normalized,
                displayName: normalized,
                productId: product.product_id
            });
        }
    });

    return Array.from(entries.values()).sort((a, b) =>
        a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base', numeric: true })
    );
}

function addProductButtons(products) {
    const productList = document.getElementById('product-list');
    const groupsContainer = document.getElementById('product-groups-container');

    if (!productList) {
        return;
    }

    productList.innerHTML = '';
    productList.classList.remove('is-empty');

    resetVariantSelection();

    const productEntries = buildProductEntries(products);

    if (!groupsContainer) {
        return;
    }

    if (productEntries.length === 0) {
        productList.classList.add('is-empty');

        const emptyState = createEmptyState('Aucun produit actif pour le moment.');
        emptyState.classList.add('product-list-empty');
        productList.appendChild(emptyState);

        groupsContainer.classList.remove('is-hidden');
        groupsContainer.innerHTML = '';
        groupsContainer.appendChild(createEmptyState('Aucun produit actif pour le moment.'));
        return;
    }

    productEntries.forEach(entry => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'product-option';
        button.dataset.productKey = entry.key;
        button.textContent = entry.displayName;
        button.setAttribute('role', 'listitem');
        button.setAttribute('aria-pressed', 'false');

        button.addEventListener('click', () => {
            if (selectedProductKey === entry.key) {
                return;
            }

            ratioFromQuery = '';
            selectProduct(entry.key);
        });

        productList.appendChild(button);
    });

    hideVariantList();

    const savedVariant = getSavedVariantSelection();
    if (tryRestoreVariantSelection(savedVariant, productEntries)) {
        return;
    }

    const initialKey = findInitialProductKey(productEntries);
    if (initialKey) {
        selectProduct(initialKey);
    } else {
        setActiveProductButton('');
    }
}

function setActiveProductButton(productKey) {
    document.querySelectorAll('#product-list .product-option').forEach(button => {
        const isActive = Boolean(productKey) && button.dataset.productKey === productKey;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function findInitialProductKey(productEntries) {
    if (!ratioFromQuery) {
        return '';
    }

    const matchedVariant = globalProducts.find(variant =>
        ratioMatches(variant.ratio_image, ratioFromQuery)
    );

    if (matchedVariant) {
        const normalized = normalizeProductName(matchedVariant.product_name);
        if (normalized) {
            return normalized;
        }
    }

    return '';
}

function selectProduct(productKey, options = {}) {
    selectedProductKey = productKey;
    setActiveProductButton(productKey);
    clearSelectedVariantState();
    displayVariantsForProduct(productKey, options);
}

function displayVariantsForProduct(normalizedName, options = {}) {
    const containers = getVariantContainers();

    if (containers.length === 0) {
        return;
    }

    containers.forEach(container => {
        container.classList.remove('is-hidden');
        container.innerHTML = '';
        container.setAttribute('aria-busy', 'true');
    });

    setVariantPanelVisibility(true);

    const filtered = globalProducts.filter(variant =>
        normalizeProductName(variant.product_name) === normalizedName
    );

    const productNameForSummary = filtered.length > 0
        ? normalizeProductName(filtered[0].product_name)
        : normalizedName;
    updateProductSelectionInfo(productNameForSummary);

    const uniqueVariants = deduplicateVariantsById(filtered).filter(variant => isValidMockupImage(variant.image));

    if (uniqueVariants.length === 0) {
        containers.forEach(container => {
            container.appendChild(createEmptyState('Aucun format avec visuel disponible pour ce produit.'));
            container.setAttribute('aria-busy', 'false');
        });
        ratioFromQuery = '';
        return;
    }

    containers.forEach(container => {
        const sectionData = buildVariantSection(uniqueVariants, {
            ratioToMatch: ratioFromQuery
        });

        container.appendChild(sectionData.section);
        container.setAttribute('aria-busy', 'false');
    });

    const variantMap = new Map(uniqueVariants.map(variant => [String(variant.variant_id), variant]));
    const requestedVariantId = options.variantIdToSelect != null ? String(options.variantIdToSelect) : '';

    let autoSelection = null;

    if (requestedVariantId && variantMap.has(requestedVariantId)) {
        const matchingElement = document.querySelector(`.product-item[data-variant-id="${requestedVariantId}"]`);
        if (matchingElement) {
            autoSelection = {
                element: matchingElement,
                variant: variantMap.get(requestedVariantId)
            };
        }
    }

    ratioFromQuery = '';

    if (autoSelection && autoSelection.element && autoSelection.variant) {
        handleVariantSelection(autoSelection.element, autoSelection.variant, { fromAutoSelection: true });
    }
}

function buildVariantSection(variants, options = {}) {
    const section = document.createElement('section');
    section.className = 'product-group';
    section.setAttribute('role', 'listitem');

    const title = document.createElement('h4');
    title.className = 'product-group-title';
    title.textContent = 'Variantes disponibles';
    section.appendChild(title);

    const list = document.createElement('div');
    list.className = 'product-variants-grid';
    section.appendChild(list);

    let firstSelectable = null;
    let ratioMatch = null;

    variants.forEach(variant => {
        const item = buildVariantItem(variant);
        list.appendChild(item);

        if (!firstSelectable) {
            firstSelectable = { element: item, variant };
        }

        if (!ratioMatch && options.ratioToMatch && ratioMatches(variant.ratio_image, options.ratioToMatch)) {
            ratioMatch = { element: item, variant };
        }
    });

    return {
        section,
        firstCandidate: firstSelectable,
        ratioCandidate: ratioMatch
    };
}

function buildVariantItem(variant) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'product-item';
    item.dataset.variantId = variant.variant_id;
    item.setAttribute('role', 'listitem');
    item.setAttribute('aria-pressed', 'false');

    const image = document.createElement('img');
    image.src = variant.image;
    image.alt = variant.product_name.includes('Clear Case') ? '' : (variant.size || 'Format');
    item.appendChild(image);

    const metaWrapper = document.createElement('div');
    metaWrapper.className = 'product-item__meta';

    if (!variant.product_name.includes('Clear Case') && variant.size) {
        const sizeText = document.createElement('p');
        sizeText.textContent = variant.size;
        sizeText.className = 'product-item__size';
        metaWrapper.appendChild(sizeText);
    }

    const colorLabel = typeof variant.color === 'string' ? variant.color.trim() : '';
    const colorHex = typeof variant.hexa === 'string' ? variant.hexa.trim() : '';
    if (colorLabel) {
        const colorRow = document.createElement('p');
        colorRow.className = 'product-item__color';

        const colorText = document.createElement('span');
        colorText.className = 'product-item__color-label';
        colorText.textContent = colorLabel;

        if (colorHex) {
            const colorDot = document.createElement('span');
            colorDot.className = 'product-item__color-dot';
            colorDot.style.backgroundColor = colorHex;
            colorDot.setAttribute('aria-hidden', 'true');
            colorRow.appendChild(colorDot);
        }
        colorRow.appendChild(colorText);
        colorRow.setAttribute('title', colorLabel);
        metaWrapper.appendChild(colorRow);
    }

    if (metaWrapper.childElementCount > 0) {
        item.appendChild(metaWrapper);
    }

    item.addEventListener('click', () => {
        handleVariantSelection(item, variant);
    });

    return item;
}

function handleVariantSelection(element, variant, options = {}) {
    highlightVariantSelection(element);

    const ratioValue = (variant.ratio_image || '').trim();
    selectedRatio = ratioValue;
    selectedProductKey = normalizeProductName(variant.product_name);

    if (typeof selectedVariant !== 'undefined') {
        selectedVariant = variant;
    }
    window.selectedVariant = variant;

    setActiveProductButton(selectedProductKey);

    updateSelectedInfo(variant);
    updateVariantSummaryImage(variant.image, normalizeProductName(variant.product_name));

    if (typeof loadImages === 'function') {
        loadImages();
    }

    if (!options.fromAutoSelection) {
        ratioFromQuery = '';
    }

    setVariantPanelVisibility(false);
}

function highlightVariantSelection(selectedElement) {
    const selectedVariantId = selectedElement?.dataset?.variantId || '';

    document.querySelectorAll('.product-item').forEach(el => {
        const isSelected = Boolean(selectedVariantId) && el.dataset.variantId === selectedVariantId;
        el.classList.toggle('selected', isSelected);
        el.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });

    if (selectedElement && !selectedVariantId) {
        selectedElement.classList.add('selected');
        selectedElement.setAttribute('aria-pressed', 'true');
    }
}

function updateSelectedInfo(variant) {
    const selectedInfo = document.getElementById('selected-info');
    if (!selectedInfo) {
        return;
    }

    const parts = [];
    const productName = normalizeProductName(variant.product_name || '');
    if (productName) {
        parts.push(productName);
    }
    if (variant.size) {
        parts.push(variant.size);
    }

    const colorLabel = typeof variant.color === 'string' ? variant.color.trim() : '';
    if (colorLabel) {
        parts.push(colorLabel);
    }

    const label = parts.join(' · ') || 'Sélectionnez un format';
    selectedInfo.textContent = label;
    selectedInfo.setAttribute('title', label);
}

function updateProductSelectionInfo(productName) {
    const selectedInfo = document.getElementById('selected-info');
    if (!selectedInfo) {
        return;
    }

    const trimmedName = typeof productName === 'string' ? productName.trim() : '';
    const label = trimmedName ? `${trimmedName} · Choisissez un format` : 'Sélectionnez un produit';

    selectedInfo.textContent = label;
    selectedInfo.setAttribute('title', label);
}

function updateVariantSummaryImage(src, productName = '') {
    const imageElement = document.getElementById('variant-summary-image');
    if (!imageElement) {
        return;
    }

    const validSource = typeof src === 'string' && src.trim() !== '' ? src : DEFAULT_SUMMARY_IMAGE;
    imageElement.src = validSource;
    imageElement.alt = productName ? `Visuel sélectionné : ${productName}` : '';
}

function parseRatioValue(ratio) {
    if (!ratio) {
        return Number.MAX_SAFE_INTEGER;
    }

    const parts = ratio.split(':').map(Number);
    if (parts.length === 2 && parts.every(number => Number.isFinite(number) && number > 0)) {
        return parts[0] / parts[1];
    }

    const matches = ratio.match(/\d+(?:[\.,]\d+)?/g);
    if (matches && matches.length >= 2) {
        const [width, height] = matches.slice(0, 2).map(value => Number(value.replace(',', '.')));
        if (Number.isFinite(width) && Number.isFinite(height) && height !== 0) {
            return width / height;
        }
    }

    return Number.MAX_SAFE_INTEGER;
}

function ratioMatches(a, b) {
    if (!a || !b) {
        return false;
    }

    return a.trim() === b.trim();
}

function isValidMockupImage(path) {
    return typeof path === 'string' && path.trim() !== '';
}

function deduplicateVariantsById(variants) {
    const variantsById = new Map();

    variants.forEach(variant => {
        const existing = variantsById.get(variant.variant_id);

        if (!existing) {
            variantsById.set(variant.variant_id, { ...variant });
            return;
        }

        const existingHasImage = isValidMockupImage(existing.image);
        const currentHasImage = isValidMockupImage(variant.image);

        if (!existingHasImage && currentHasImage) {
            existing.image = variant.image;
        }
    });

    return Array.from(variantsById.values());
}

function createEmptyState(message) {
    const paragraph = document.createElement('p');
    paragraph.className = 'empty-state';
    paragraph.textContent = message;
    paragraph.setAttribute('role', 'status');
    paragraph.setAttribute('aria-live', 'polite');
    return paragraph;
}
