// Nouveau show_ratio.js - gestion du mode 'ratio' + ajout de la gestion 'produit' et 'variant' + appel loadImages() au clic sur variant avec logs

const DEFAULT_RATIO = '1:1';
let selectedRatio = DEFAULT_RATIO;
let selectedProductKey = '';
let globalProducts = [];
let ratioFromQuery = '';

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

function toggleRatioMenu() {
    const ratioMenu = document.getElementById('ratio-menu');
    const arrowIcon = document.getElementById('arrow-icon');

    const isMenuOpen = ratioMenu && ratioMenu.style.display === 'block';
    if (ratioMenu) {
        ratioMenu.style.display = isMenuOpen ? 'none' : 'block';
    }
    if (arrowIcon) {
        arrowIcon.classList.toggle('open', !isMenuOpen);
    }
}

function setDefaultSelectedInfo() {
    const selectedInfo = document.getElementById('selected-info');
    if (!selectedInfo) {
        return;
    }

    const label = `Format ${DEFAULT_RATIO}`;
    selectedInfo.textContent = label;
    selectedInfo.setAttribute('title', label);
}

function resetVariantSelection() {
    selectedProductKey = '';
    selectedRatio = DEFAULT_RATIO;

    if (typeof selectedVariant !== 'undefined') {
        selectedVariant = null;
    }
    window.selectedVariant = null;

    setDefaultSelectedInfo();
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

function selectProduct(productKey) {
    selectedProductKey = productKey;
    setActiveProductButton(productKey);
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

    const filtered = globalProducts.filter(variant =>
        normalizeProductName(variant.product_name) === normalizedName
    );

    const uniqueVariants = deduplicateVariantsById(filtered).filter(variant => isValidMockupImage(variant.image));

    toggleImageGrid(true);

    if (uniqueVariants.length === 0) {
        containers.forEach(container => {
            container.appendChild(createEmptyState('Aucun format avec visuel disponible pour ce produit.'));
            container.setAttribute('aria-busy', 'false');
        });
        return;
    }

    const sortedVariants = uniqueVariants
        .slice()
        .sort((a, b) => {
            const ratioDiff = parseRatioValue(a.ratio_image) - parseRatioValue(b.ratio_image);
            if (ratioDiff !== 0) {
                return ratioDiff;
            }

            return getVariantOrderValue(a) - getVariantOrderValue(b);
        });

    let firstSelectable = null;
    let ratioMatch = null;

    containers.forEach((container, index) => {
        const { section, firstCandidate, ratioCandidate } = buildVariantSection(sortedVariants, {
            ratioToMatch: ratioFromQuery
        });

        container.appendChild(section);
        container.setAttribute('aria-busy', 'false');

        if (index === 0) {
            if (ratioCandidate) {
                ratioMatch = ratioCandidate;
            }
            if (firstCandidate) {
                firstSelectable = firstCandidate;
            }
        }
    });

    const targetSelection = ratioMatch || firstSelectable;
    if (targetSelection) {
        handleVariantSelection(targetSelection.element, targetSelection.variant, { fromAutoSelection: true });
        if (ratioMatch) {
            ratioFromQuery = '';
        }
    } else {
        containers.forEach(container => {
            container.appendChild(createEmptyState('Aucun format sélectionnable.'));
        });
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

    if (!variant.product_name.includes('Clear Case')) {
        const sizeText = document.createElement('p');
        sizeText.textContent = variant.size;
        item.appendChild(sizeText);
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

    if (typeof loadImages === 'function') {
        loadImages();
    }

    if (!options.fromAutoSelection) {
        ratioFromQuery = '';
    }
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

function getVariantOrderValue(variant) {
    if (!variant || typeof variant !== 'object') {
        return Number.MAX_SAFE_INTEGER;
    }

    const rawOrder = variant.variant_order ??
        variant.display_order ??
        variant.order ??
        variant.order_index ??
        variant.variant_id;

    const orderNumber = Number(rawOrder);
    return Number.isFinite(orderNumber) ? orderNumber : Number.MAX_SAFE_INTEGER;
}

function createEmptyState(message) {
    const paragraph = document.createElement('p');
    paragraph.className = 'empty-state';
    paragraph.textContent = message;
    paragraph.setAttribute('role', 'status');
    paragraph.setAttribute('aria-live', 'polite');
    return paragraph;
}
