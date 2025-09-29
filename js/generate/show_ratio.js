// Nouveau show_ratio.js - gestion du mode 'ratio' + ajout de la gestion 'produit' et 'variant' + appel loadImages() au clic sur variant avec logs

const DEFAULT_RATIO = '1:1';
const DEFAULT_SUMMARY_IMAGE = 'https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png';
const PRODUCT_CATEGORY_KEYWORDS = [
    { key: 'cases', label: 'Coques', keywords: ['coque', 'case'] },
    { key: 'mugs', label: 'Mugs', keywords: ['mug', 'tasse'] },
    { key: 'posters', label: 'Posters', keywords: ['poster', 'affiche'] },
    { key: 'textile', label: 'Textile', keywords: ['t-shirt', 'tee', 'hoodie', 'sweat', 'textile'] },
    { key: 'bags', label: 'Sacs', keywords: ['sac', 'tote', 'bag'] }
];
const DEFAULT_CATEGORY = { key: 'others', label: 'Autres' };
let selectedRatio = DEFAULT_RATIO;
let selectedProductKey = '';
let globalProducts = [];
let globalProductEntries = [];
let ratioFromQuery = '';
let activeProductCategory = 'all';

document.addEventListener('DOMContentLoaded', function () {
    ratioFromQuery = getRatioFromQueryParam();
    setDefaultSelectedInfo();
    loadProductData();
});

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
    const grid = document.getElementById('image-grid');
    const wrapper = document.getElementById('image-grid-wrapper');

    [grid, wrapper].forEach(element => {
        if (element) {
            element.classList.toggle('is-hidden', Boolean(isHidden));
            element.setAttribute('aria-hidden', Boolean(isHidden).toString());
        }
    });
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

function deriveCategoryFromProductName(name) {
    const normalized = typeof name === 'string' ? name.toLowerCase() : '';

    const match = PRODUCT_CATEGORY_KEYWORDS.find(category =>
        category.keywords.some(keyword => normalized.includes(keyword))
    );

    return match || DEFAULT_CATEGORY;
}

function buildCategoryCollection(entries) {
    const map = new Map();

    entries.forEach(entry => {
        if (!entry || !entry.categoryKey) {
            return;
        }

        if (!map.has(entry.categoryKey)) {
            map.set(entry.categoryKey, {
                key: entry.categoryKey,
                label: entry.categoryLabel
            });
        }
    });

    return Array.from(map.values()).sort((a, b) =>
        a.label.localeCompare(b.label, 'fr', { sensitivity: 'base', numeric: true })
    );
}

function buildProductEntries(products) {
    const entries = new Map();

    products.forEach(product => {
        const normalized = normalizeProductName(product.product_name);
        if (!normalized || normalized === 'Clear Case') {
            return;
        }

        const category = deriveCategoryFromProductName(product.product_name);

        if (!entries.has(normalized)) {
            entries.set(normalized, {
                key: normalized,
                displayName: normalized,
                productId: product.product_id,
                categoryKey: category.key,
                categoryLabel: category.label
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

    if (!productList || !groupsContainer) {
        return;
    }

    productList.innerHTML = '';
    productList.classList.remove('is-empty');

    resetVariantSelection();

    globalProductEntries = buildProductEntries(products);
    activeProductCategory = 'all';

    if (globalProductEntries.length === 0) {
        productList.classList.add('is-empty');

        const emptyState = createEmptyState('Aucun produit actif pour le moment.');
        emptyState.classList.add('product-list-empty');
        productList.appendChild(emptyState);

        groupsContainer.classList.remove('is-hidden');
        groupsContainer.innerHTML = '';
        groupsContainer.appendChild(createEmptyState('Aucun produit actif pour le moment.'));
        return;
    }

    renderProductFilters(globalProductEntries);

    const visibleEntries = renderProductList(globalProductEntries);

    hideVariantList();

    let initialKey = findInitialProductKey(globalProductEntries);
    const hasInitialInVisible = visibleEntries.some(entry => entry.key === initialKey);

    if (!initialKey || !hasInitialInVisible) {
        initialKey = visibleEntries[0]?.key || '';
    }

    if (initialKey) {
        selectProduct(initialKey);
    } else {
        setActiveProductButton('');
    }
}

function renderProductFilters(entries) {
    const filterBar = document.getElementById('product-filter-bar');
    const filterList = document.getElementById('product-filters');

    if (!filterBar || !filterList) {
        return;
    }

    const categories = buildCategoryCollection(entries);
    filterList.innerHTML = '';

    const shouldDisplayFilters = categories.length > 1;
    filterBar.classList.toggle('is-hidden', !shouldDisplayFilters);
    filterBar.setAttribute('aria-hidden', shouldDisplayFilters ? 'false' : 'true');

    if (!shouldDisplayFilters) {
        activeProductCategory = 'all';
        return;
    }

    const filters = [{ key: 'all', label: 'Tous' }, ...categories];

    filters.forEach(filter => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'filter-chip';
        button.dataset.filterKey = filter.key;
        button.textContent = filter.label;
        button.setAttribute('aria-pressed', activeProductCategory === filter.key ? 'true' : 'false');

        if (activeProductCategory === filter.key) {
            button.classList.add('is-active');
        }

        button.addEventListener('click', () => {
            handleFilterSelection(filter.key);
        });

        filterList.appendChild(button);
    });
}

function handleFilterSelection(categoryKey) {
    if (activeProductCategory === categoryKey) {
        return;
    }

    activeProductCategory = categoryKey;
    setActiveFilterChip(categoryKey);

    const visibleEntries = renderProductList(globalProductEntries);

    if (visibleEntries.length === 0) {
        selectedProductKey = '';
        setActiveProductButton('');
        clearSelectedVariantState();
        return;
    }

    if (visibleEntries.some(entry => entry.key === selectedProductKey)) {
        return;
    }

    const preferredKey = findInitialProductKey(globalProductEntries);
    const fallback = visibleEntries.find(entry => entry.key === preferredKey)?.key
        || visibleEntries[0]?.key
        || '';

    if (fallback) {
        selectProduct(fallback);
    } else {
        setActiveProductButton('');
        clearSelectedVariantState();
    }
}

function setActiveFilterChip(categoryKey) {
    document.querySelectorAll('#product-filters .filter-chip').forEach(button => {
        const isActive = button.dataset.filterKey === categoryKey;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
}

function renderProductList(entries) {
    const productList = document.getElementById('product-list');
    const groupsContainer = document.getElementById('product-groups-container');

    if (!productList || !groupsContainer) {
        return [];
    }

    productList.innerHTML = '';
    productList.classList.remove('is-empty');

    const filteredEntries = entries.filter(entry =>
        activeProductCategory === 'all' || entry.categoryKey === activeProductCategory
    );

    if (filteredEntries.length === 0) {
        productList.classList.add('is-empty');

        const emptyState = createEmptyState('Aucun produit dans cette catégorie.');
        emptyState.classList.add('product-list-empty');
        productList.appendChild(emptyState);

        groupsContainer.classList.remove('is-hidden');
        groupsContainer.innerHTML = '';
        groupsContainer.appendChild(createEmptyState('Sélectionnez une autre catégorie pour afficher les variantes.'));

        return [];
    }

    groupsContainer.classList.add('is-hidden');
    groupsContainer.innerHTML = '';

    filteredEntries.forEach(entry => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'product-option';
        button.dataset.productKey = entry.key;
        button.textContent = entry.displayName;
        button.setAttribute('role', 'listitem');
        button.setAttribute('aria-pressed', selectedProductKey === entry.key ? 'true' : 'false');

        if (selectedProductKey === entry.key) {
            button.classList.add('is-active');
        }

        button.addEventListener('click', () => {
            if (selectedProductKey === entry.key) {
                return;
            }

            ratioFromQuery = '';
            selectProduct(entry.key);
        });

        productList.appendChild(button);
    });

    return filteredEntries;
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

function selectProduct(productKey) {
    selectedProductKey = productKey;
    setActiveProductButton(productKey);
    clearSelectedVariantState();
    displayVariantsForProduct(productKey);
}

function displayVariantsForProduct(normalizedName) {
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

    ratioFromQuery = '';
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

    variants.forEach((variant, index) => {
        const item = buildVariantItem(variant, index);
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

function buildVariantItem(variant, index = 0) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'product-item';
    item.dataset.variantId = variant.variant_id;
    item.setAttribute('role', 'listitem');
    item.setAttribute('aria-pressed', 'false');
    item.style.setProperty('--card-index', String(index));

    const visualWrapper = document.createElement('div');
    visualWrapper.className = 'product-item__visual';

    const image = document.createElement('img');
    image.className = 'product-item__image';
    image.src = variant.image;
    image.loading = 'lazy';

    const normalizedName = normalizeProductName(variant.product_name);
    const productTitle = normalizedName && normalizedName !== 'Clear Case'
        ? normalizedName
        : (variant.variant_name || variant.size || 'Variante');

    image.alt = productTitle ? `Visuel ${productTitle}` : (variant.size || 'Format');

    visualWrapper.appendChild(image);
    item.appendChild(visualWrapper);

    const label = document.createElement('div');
    label.className = 'product-item__label';

    if (productTitle) {
        const titleElement = document.createElement('p');
        titleElement.className = 'product-item__name';
        titleElement.textContent = productTitle;
        label.appendChild(titleElement);
    }

    if (variant.size) {
        const sizeText = document.createElement('p');
        sizeText.className = 'product-item__variant';
        sizeText.textContent = variant.size;
        label.appendChild(sizeText);
    }

    item.appendChild(label);

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
