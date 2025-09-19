/**
 * FileLibrary (réécriture complète)
 * - Dossiers : my / community / imported
 * - Tri : name / date
 * - Recherche (local + communauté distante)
 * - Filtres : Produit en cours / Produit (liste) / Taille (dynamique) / Formats standards
 * - Label Format: "Format: {NomProduit} — {Taille}" (jamais de ratio ni couleur)
 * - Pagination
 * - Upload (drag & drop + input) / Suppression
 * - Caches: variantes (ratio/tailles) + formatProducts (en option)
 *
 * Dépendances:
 *  - jQuery (window.jQuery)
 *  - CanvasManager.addImage(url, [opts], [cb])
 *  - (optionnel) window.DesignCache.getPlacement(productId, url, variantId)
 *
 * Points d'ancrage HTML attendus:
 *  - #fileList (conteneur des items)
 *  - #paginationControls (conteneur pagination)
 *  - #searchInput (input texte)
 *  - #sort-select (select "name" | "date")
 *  - #folder-selector avec #folder-my, #folder-community, #folder-imported
 *  - #format-block (barre de filtres format) avec:
 *      - #open-format-menu (bouton label)
 *      - #formatOptions (menu formats standards + #format-product)
 *      - #product-block (liste produits au clic sur #format-product)
 *      - #size-block (bloc tailles dynamiques) + #sizeButtons
 *      - #filter-all (filtre principal "Tous")
 *      - #filter-product-ratio (bouton "Produit en cours")
 *  - Zone d'upload:
 *      - #fileDropZone (inclut .dropzone-default, .upload-feedback > span)
 *      - #fileInput (type="file", multiple)
 *
 * Endpoints:
 *  - /wp-json/api/v1/products/list             -> [{ product_id, name }]
 *  - /wp-json/api/v1/products/variants_all     -> [{ product_id, variant_id, size, ratio_image, color, hexa }]
 *  - /wp-json/api/v1/products/{id}/variants    -> [{ variant_id, size, ratio_image, color, hexa, ... }]
 *  - /wp-json/api/v1/images/load?limit&offset&search (communauté)
 *  - /wp-json/customiizer/v1/upload-image/     (POST {url, name, size, user_id})
 *  - /wp-json/customiizer/v1/user-images/?user_id
 *  - /wp-json/customiizer/v1/delete-image/     (POST {image_url, user_id})
 */

(function ($) {
  'use strict';

  if (typeof baseUrl === 'undefined') {
    var baseUrl = window.location.origin;
  }

  // -----------------------------
  // Etat global
  // -----------------------------
  const state = {
    folder: 'my',           // my | community | imported
    sort: 'date',           // name | date
    search: '',
    page: 1,
    itemsPerPage: 40,

    // Filtres format
    format: 'all',          // ratio sélectionné
    productId: null,        // produit sélectionné (via liste)
    productName: '',        // libellé produit (ou nom du produit en cours)
    size: null,             // taille sélectionnée (ex: 61×91 cm)

    // Données images
    myImages: [],
    communityImages: [],
    importedImages: [],

    // Caches variantes
    variantCache: {},       // { [product_id]: [{variant_id, size, ratio_image, color, hexa}, ...] }
    productFormats: [],     // ratios disponibles pour le productId sélectionné
    sizeRatioMap: {},       // { sizeLabel -> ratio }

    // Produits
    products: [],

    // Timers
    searchTimer: null
  };

  // -----------------------------
  // Helpers
  // -----------------------------
  const normalize = v => (v || '').toString().trim();
  const normalizeRatio = v => normalize(v);
  const normalizeLabel = v => normalize(v);
  const PRODUCT_NAME_PLACEHOLDER_PATTERN = /^\s*(nom du produit|product name)\s*$/i;
  const CURRENT_PRODUCT_FILTER_LABEL = 'Produit en cours';

  function safeJsonParse(json, fallback = null) {
    try { return JSON.parse(json); } catch (_e) { return fallback; }
  }

  function currentImages() {
    if (state.folder === 'my') return state.myImages;
    if (state.folder === 'community') return state.communityImages;
    return state.importedImages;
  }

  function readProductNameFromDom() {
    const label = normalizeLabel($('.product-name').first().text());
    if (!label || PRODUCT_NAME_PLACEHOLDER_PATTERN.test(label)) return '';
    return label;
  }

  function resolveVariant(variantCandidate) {
    if (variantCandidate && typeof variantCandidate === 'object') return variantCandidate;
    if (typeof selectedVariant !== 'undefined' && selectedVariant && typeof selectedVariant === 'object') return selectedVariant;
    if (window.selectedVariant && typeof window.selectedVariant === 'object') return window.selectedVariant;
    return null;
  }

  function extractVariantMeta(variant) {
    if (!variant || typeof variant !== 'object') return { size: '', label: '', color: '', ratio: '' };
    const size = normalizeLabel(
      variant.size
      || variant.size_name
      || variant.sizeName
      || variant.variant_size
      || variant.variantSize
    );
    const labelCandidates = [
      variant.variant_label, variant.variantLabel, variant.label, variant.name,
      variant.variant_name, variant.variantName, variant.display_name, variant.displayName,
      variant.size_label, variant.sizeLabel
    ];
    let label = '';
    for (const c of labelCandidates) {
      const n = normalizeLabel(c);
      if (n && n !== size) { label = n; break; }
    }
    const colorCandidates = [
      variant.color, variant.color_label, variant.colorLabel,
      variant.colour, variant.colour_label, variant.colourLabel
    ];
    let color = '';
    for (const c of colorCandidates) {
      const n = normalizeLabel(c);
      if (n) { color = n; break; }
    }
    const ratio = normalizeRatio(variant.ratio_image);
    return { size, label, color, ratio };
  }

  // -----------------------------
  // Navigation / rendu principal
  // -----------------------------
  function updateFormatLabel() {
    const button = $('#open-format-menu');
    if (!button.length) return;

    const hasLabel = !!state.productName || (state.format && state.format !== 'all') || !!state.size;
    if (!hasLabel) {
      button.removeClass('active').text('Format');
      return;
    }

    // Affichage sans ratio ni couleur, uniquement Produit + Taille
    let base = state.productName || '';
    if (!base && state.format && state.format !== 'all') base = state.format;

    let label = base ? `Format: ${base}` : 'Format';
    if (state.size) label += ` — ${state.size}`;

    button.addClass('active').text(label);
  }

  function sortImages(arr) {
    return arr.slice().sort((a, b) => {
      if (state.sort === 'name') {
        const an = normalize(a.name || a.image_prefix || (a.url || a.image_url || '').split('/').pop());
        const bn = normalize(b.name || b.image_prefix || (b.url || b.image_url || '').split('/').pop());
        return an.localeCompare(bn);
      }
      // date
      const ad = new Date(a.date_created || a.image_date || a.date || 0).getTime();
      const bd = new Date(b.date_created || b.image_date || b.date || 0).getTime();
      return bd - ad;
    });
  }

  function matchSearch(img, term) {
    const rawUrl = img.url || img.image_url || '';
    const name = img.name || img.image_prefix || rawUrl.split('/').pop();
    const prompt = typeof img.prompt === 'object'
      ? (img.prompt.text || img.prompt.prompt || JSON.stringify(img.prompt))
      : (img.prompt || '');
    const haystack = `${name} ${prompt}`.toLowerCase();
    return haystack.includes(term);
  }

  function filterByFormat(img) {
    // imported: pas de filtre format/produit/size
    if (state.folder === 'imported') return true;

    // size -> format
    let selectedFormat = null;
    if (state.size && state.sizeRatioMap[state.size]) selectedFormat = state.sizeRatioMap[state.size];
    else if (state.format !== 'all') selectedFormat = state.format;

    const allowedFormats = (state.productId && Array.isArray(state.productFormats)) ? state.productFormats : null;

    if (selectedFormat && img.format !== selectedFormat) return false;
    if (!selectedFormat && allowedFormats && !allowedFormats.includes(img.format)) return false;

    return true;
  }

  function renderEmptyState(container, filtered, totalPages) {
    const filterActive = isAnyFilterActive();
    const rawSearchValue = $('#searchInput').val() || '';
    const hasSearch = rawSearchValue.trim().length > 0;

    // Construire un label pour le bouton "Générer"
    const labelParts = [];
    if (state.productName) labelParts.push(state.productName);
    if (state.size) labelParts.push(state.size);
    const label = labelParts.join(' — ') || (hasSearch ? `« ${rawSearchValue.trim()} »` : 'vos filtres');

    let titleText = 'Aucune image ne correspond à vos filtres.';
    if (labelParts.length && !hasSearch) titleText = `Aucune image pour ${label}.`;
    if (!labelParts.length && hasSearch) titleText = `Aucun résultat pour « ${rawSearchValue.trim()} ».`;

    const customizeUrl = buildCustomizeUrl({
      ratio: computeRatioForCustomize(),
      product: state.productId,
      size: state.size
    });

    const empty = $(`
      <div class="file-library-empty">
        <p class="file-library-empty-title"></p>
        <p class="file-library-empty-subtitle"></p>
        <div class="file-library-empty-actions">
          <a class="file-library-empty-primary" target="_blank" rel="noopener"></a>
          <button type="button" class="file-library-empty-secondary">Communauté</button>
        </div>
      </div>
    `);

    empty.find('.file-library-empty-title').text(titleText);

    const subtitle = hasSearch || labelParts.length
      ? `Générez une image pour ${label} sur Customiize ou explorez la Communauté pour découvrir des visuels partagés.`
      : `Générez une image sur Customiize ou explorez la Communauté pour découvrir des visuels partagés.`;

    const sub = empty.find('.file-library-empty-subtitle').text(subtitle);

    if (filterActive) {
      const resetLink = $('<a href="#" class="file-library-reset-filters">Réinitialiser les filtres</a>');
      resetLink.on('click', function (e) {
        e.preventDefault();
        $('#searchInput').val('');
        resetAllFilters();
        state.page = 1;
        if (state.folder === 'community') {
          clearTimeout(state.searchTimer);
          fetchCommunityImages('');
        } else {
          renderFileList();
        }
      });
      sub.append(' ').append('Vous pouvez aussi ').append(resetLink).append('.');
    }

    empty.find('.file-library-empty-primary')
      .text(`Générer une image pour ${label}`)
      .attr('href', customizeUrl);

    empty.find('.file-library-empty-secondary').on('click', function () {
      $('#folder-community').trigger('click').trigger('focus');
    });

    container.append(empty);
  }

  function isAnyFilterActive() {
    const rawSearchValue = $('#searchInput').val() || '';
    const hasSearch = rawSearchValue.trim().length > 0;
    const hasFormatFilter = (state.folder !== 'imported') && (
      (state.format && state.format !== 'all') ||
      (state.productId !== null && state.productId !== undefined) ||
      (state.size !== null && state.size !== undefined)
    );
    return hasSearch || hasFormatFilter;
  }

  function buildCustomizeUrl(options = {}) {
    const basePath = '/customiize';
    const params = new URLSearchParams();
    const ratio = normalize(options.ratio);
    if (ratio) params.set('ratio', ratio);
    const product = options.product;
    if (product) params.set('product', product);
    const size = normalize(options.size);
    if (size) params.set('size', size);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  function computeRatioForCustomize() {
    // priorité: selectedFormat -> currentFormatFilter -> sizeRatioMap -> allowedFormats unique -> stored ratio on product button
    // Ici on reprend la logique compacte:
    if (state.size && state.sizeRatioMap[state.size]) return state.sizeRatioMap[state.size];
    if (state.format && state.format !== 'all') return state.format;
    if (state.productFormats && state.productFormats.length === 1) return state.productFormats[0];

    const productRatioButton = $('#filter-product-ratio');
    const storedRatio = normalize(productRatioButton.data('ratio'));
    if (storedRatio) return storedRatio;

    return null;
  }

  function renderPagination(totalPages) {
    const controls = $('#paginationControls');
    controls.empty();
    if (totalPages <= 1) return controls.hide();
    controls.show();

    const prev = $('<button class="page-prev">Précédent</button>');
    const next = $('<button class="page-next">Suivant</button>');
    const input = $(`<input type="number" class="page-input" min="1" max="${totalPages}" value="${state.page}">`);
    const total = $(`<span class="page-total">/ ${totalPages}</span>`);

    prev.prop('disabled', state.page === 1);
    next.prop('disabled', state.page === totalPages);

    prev.on('click', function () {
      if (state.page > 1) {
        state.page--;
        renderFileList();
      }
    });

    next.on('click', function () {
      if (state.page < totalPages) {
        state.page++;
        renderFileList();
      }
    });

    input.on('change keydown', function (e) {
      if (e.type === 'change' || e.key === 'Enter') {
        let page = parseInt($(this).val(), 10);
        if (isNaN(page)) return;
        page = Math.max(1, Math.min(totalPages, page));
        if (page !== state.page) {
          state.page = page;
          renderFileList();
        }
      }
    });

    controls.append(prev, input, total, next);
  }

  function renderFileList(skipSearch = false) {
    const container = $('#fileList');
    container.empty();

    let images = currentImages();
    if (!Array.isArray(images)) images = [];

    // recherche
    const rawSearchValue = $('#searchInput').val() || '';
    const searchValue = skipSearch ? '' : rawSearchValue.toLowerCase();
    if (searchValue) {
      images = images.filter(img => matchSearch(img, searchValue));
    }

    // filtre format/produit/size
    images = images.filter(filterByFormat);

    // tri
    const sorted = sortImages(images);

    // pagination
    const totalPages = Math.max(1, Math.ceil(sorted.length / state.itemsPerPage));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.itemsPerPage;
    const pageItems = sorted.slice(start, start + state.itemsPerPage);

    // rendu items
    if (pageItems.length === 0) {
      if (state.folder === 'my' || isAnyFilterActive()) {
        renderEmptyState(container, sorted, totalPages);
      } else {
        container.append(`<div class="file-library-empty"><p class="file-library-empty-message">Aucune image disponible pour le moment.</p></div>`);
      }
      renderPagination(totalPages);
      return;
    }

    pageItems.forEach(img => {
      const rawUrl = img.url || img.image_url;
      let url = rawUrl;
      if (rawUrl && typeof rawUrl === 'object') {
        url = rawUrl.url || rawUrl.src || rawUrl.path || '';
      }
      if (!url || typeof url !== 'string') return; // Ignore sans URL

      const name = img.name || img.image_prefix || url.split('/').pop();

      const menu = state.folder === 'imported'
        ? `<button type="button" class="file-menu-button"><i class="fas fa-ellipsis-v"></i></button>
           <div class="file-menu-dropdown"><button class="file-delete">Supprimer</button></div>`
        : '';

      const item = $(`
        <div class="file-item">
          ${menu}
          <img src="${url}" alt="${name}" class="preview-enlarge">
          <i class="fas fa-search-plus preview-icon"></i>
          <button type="button" class="apply-button">Appliquez</button>
          <span class="file-name">${name}</span>
        </div>
      `);

      const $img = item.find('img.preview-enlarge');
      $img.attr({
        'data-display_name': img.display_name || '',
        'data-user-id': img.user_id || '',
        'data-format-image': img.format || '',
        'data-prompt': (typeof img.prompt === 'object'
          ? (img.prompt.text || img.prompt.prompt || JSON.stringify(img.prompt))
          : (img.prompt || ''))
      });

      $img.on('click', function (e) { e.stopPropagation(); });
      item.find('.preview-icon').on('click', function (e) {
        e.stopPropagation();
        if (typeof handleImageClick === 'function') {
          handleImageClick({ target: $img[0] });
        }
      });

      item.on('click', function (e) {
        if ($(e.target).closest('.apply-button, .preview-icon, .file-menu-button, .file-menu-dropdown').length) return;
        if (typeof handleImageClick === 'function') {
          handleImageClick({ target: $img[0] });
        }
      });

      item.find('.apply-button').on('click', function (e) {
        e.stopPropagation();
        const activeVariant = resolveVariant();
        const placement = window.DesignCache?.getPlacement
          ? window.DesignCache.getPlacement(window.currentProductId, url, activeVariant?.variant_id)
          : null;
        const onAdded = function () {
          if (typeof updateAddImageButtonVisibility === 'function') {
            updateAddImageButtonVisibility();
          }
        };
        if (placement) {
          CanvasManager.addImage(url, { placement }, onAdded);
        } else {
          CanvasManager.addImage(url, onAdded);
        }
        $('#imageSourceModal').hide();
        if (typeof releaseFocus === 'function') {
          releaseFocus($('#imageSourceModal'));
        }
      });

      if (state.folder === 'imported') {
        const menuBtn = item.find('.file-menu-button');
        const dropdown = item.find('.file-menu-dropdown');
        menuBtn.on('click', function (e) {
          e.stopPropagation();
          dropdown.toggle();
        });
        item.on('mouseleave', function () { dropdown.hide(); });
        dropdown.find('.file-delete').on('click', function (e) {
          e.stopPropagation();
          deleteImportedImage(url);
        });
      }

      container.append(item);
    });

    renderPagination(totalPages);

    if (typeof enableImageEnlargement === 'function') {
      enableImageEnlargement();
    }
  }

  // -----------------------------
  // Variantes / Produits / Formats
  // -----------------------------
  function resetAllFilters() {
    state.format = 'all';
    state.productId = null;
    state.productName = '';
    state.size = null;
    state.productFormats = [];
    state.sizeRatioMap = {};

    $('#mainFormatFilters .format-main').removeClass('active');
    $('#filter-all').addClass('active');
    $('#formatOptions').removeClass('active');
    $('#formatOptions .format-btn').removeClass('active');
    $('#product-block').removeClass('active');
    $('#product-block button').removeClass('active');
    $('#size-block').hide();
    $('#sizeButtons').empty();
    $('#open-format-menu').removeClass('active').text('Format');

    const productRatioButton = $('#filter-product-ratio');
    if (productRatioButton.length) {
      productRatioButton
        .removeClass('active')
        .text(CURRENT_PRODUCT_FILTER_LABEL)
        .removeData('productName')
        .removeData('variantLabel')
        .removeData('variantColor')
        .removeData('displayLabel')
        .removeData('ratio')
        .removeData('variantSize')
        .removeData('variant-size');
    }
  }

  async function ensureVariantCache() {
    if (Object.keys(state.variantCache).length > 0) return false;
    try {
      const res = await fetch('/wp-json/api/v1/products/variants_all');
      const data = await res.json();
      const grouped = {};
      (data || []).forEach(v => {
        if (!grouped[v.product_id]) grouped[v.product_id] = [];
        grouped[v.product_id].push({
          variant_id: v.variant_id,
          size: v.size,
          ratio_image: v.ratio_image,
          color: v.color || null,
          hexa: v.hexa || null
        });
      });
      state.variantCache = grouped;

      // Enregistrer en session (léger)
      try {
        const tmp = { variantBasics: state.variantCache, models: {}, products: state.products };
        sessionStorage.setItem('customizerCache', JSON.stringify(tmp));
      } catch (_e) {}

      return true;
    } catch (err) {
      console.error('❌ preload variants', err);
      return false;
    }
  }

  function applyProductRatioFilter(ratio) {
    const normalizedRatio = normalizeRatio(ratio);
    if (!normalizedRatio) return;

    state.format = normalizedRatio;
    // Les filtres "Produit en cours" n'imposent pas un productId, on conserve le nom produit si dispo
    state.productId = null;
    state.size = null;
    state.productFormats = [];
    state.sizeRatioMap = {};

    $('#mainFormatFilters .format-main').removeClass('active');
    $('#filter-product-ratio').addClass('active');
    $('#formatOptions .format-btn').removeClass('active');
    $('#product-block').removeClass('active');
    $('#formatOptions').removeClass('active');
    $('#size-block').hide();
    $('#sizeButtons').empty();

    // Mettre à jour le label format avec produit + taille si disponibles
    const productRatioButton = $('#filter-product-ratio');
    // Assurer que productName est calé
    const domName = readProductNameFromDom();
    if (domName) state.productName = domName;
    else state.productName = normalize(productRatioButton.data('productName')) || state.productName;

    // Forcer taille depuis variant actif si dispo
    let size = normalize(productRatioButton.data('variantSize')) || normalize(productRatioButton.data('variant-size'));
    if (!size) {
      const variant = resolveVariant();
      size = normalize(variant?.size || variant?.variant_size);
    }
    if (size) state.size = size;

    updateFormatLabel();

    state.page = 1;
    renderFileList();
  }

  function buildSizesForProduct(productId, variants) {
    state.productFormats = [];
    state.sizeRatioMap = {};

    const sizeEntries = [];
    const seenSizes = new Set();

    (variants || []).forEach(variant => {
      if (!variant) return;
      const ratio = normalizeRatio(variant.ratio_image);
      if (!ratio) return;

      const rawSize = normalize(variant.size);
      const sizeLabel = normalize(rawSize);
      if (!sizeLabel) return;

      const dedupeKey = sizeLabel.toLowerCase();
      if (!seenSizes.has(dedupeKey)) {
        seenSizes.add(dedupeKey);

        const variantLabel = normalize(variant.variant_label || variant.variantLabel || variant.label || variant.name || variant.variant_name || variant.variantName || variant.size_label || variant.sizeLabel);
        sizeEntries.push({
          rawSize,
          sizeLabel,
          ratio,
          variantLabel
        });
      }

      state.sizeRatioMap[sizeLabel] = ratio;
      if (rawSize && rawSize !== sizeLabel) state.sizeRatioMap[rawSize] = ratio;

      if (!state.productFormats.includes(ratio)) state.productFormats.push(ratio);
    });

    // Rendu des boutons tailles
    const sizeContainer = $('#sizeButtons');
    sizeContainer.empty();

    if (sizeEntries.length === 0) {
      $('#size-block').hide();
      state.page = 1;
      renderFileList();
      return;
    }

    sizeEntries.forEach(entry => {
      const label = entry.sizeLabel || entry.rawSize;
      const sbtn = $(`<button type="button" class="size-btn"></button>`).text(label);
      sbtn.data('formatMeta', {
        ratio: entry.ratio,
        productLabel: state.productName,
        variantLabel: entry.variantLabel,
        sizeLabel: entry.sizeLabel,
        rawSize: entry.rawSize
      });
      sbtn.on('click', function () {
        const meta = $(this).data('formatMeta') || {};
        state.size = meta.sizeLabel || meta.rawSize || '';
        state.format = meta.ratio || 'all';

        $('.size-btn').removeClass('active');
        $(this).addClass('active');

        state.page = 1;
        updateFormatLabel();
        renderFileList();
        $('#formatOptions').removeClass('active');
      });
      sizeContainer.append(sbtn);
    });

    $('#size-block').css('display', 'flex');
    $('#sizeButtons button').removeClass('active');
    state.page = 1;
    renderFileList();
  }

  async function loadProducts() {
    try {
      const res = await fetch('/wp-json/api/v1/products/list');
      const products = await res.json();
      state.products = Array.isArray(products) ? products : [];
      const container = $('#product-block');
      container.empty();

      state.products.forEach(p => {
        const btn = $('<button type="button" class="product-btn"></button>').text(p.name);
        btn.on('click', async function () {
          state.productId = p.product_id;
          state.productName = normalize(p.name);
          state.size = null;
          state.format = 'all';
          state.productFormats = [];
          state.sizeRatioMap = {};

          $('.product-btn').removeClass('active');
          $('#format-block .format-btn').removeClass('active');
          $(this).addClass('active');
          $('#mainFormatFilters .format-main').removeClass('active');
          $('#open-format-menu').removeClass('active').text('Format');

          const cached = state.variantCache[p.product_id];
          if (cached) {
            buildSizesForProduct(p.product_id, cached);
          } else {
            try {
              const r = await fetch(`/wp-json/api/v1/products/${p.product_id}/variants`);
              const variants = await r.json();
              state.variantCache[p.product_id] = (variants || []).map(v => ({
                variant_id: v.variant_id,
                size: v.size,
                ratio_image: v.ratio_image,
                color: v.color || null,
                hexa: v.hexa || null
              }));
              try {
                const tmp = { variantBasics: state.variantCache, models: {}, products: state.products };
                sessionStorage.setItem('customizerCache', JSON.stringify(tmp));
              } catch (_e) {}
              buildSizesForProduct(p.product_id, state.variantCache[p.product_id]);
            } catch (err) {
              console.error('❌ load sizes', err);
              $('#size-block').hide();
            }
          }
        });
        container.append(btn);
      });
    } catch (err) {
      console.error('❌ load products', err);
    }
  }

  function updateProductRatioButton(variantCandidate) {
    const productRatioButton = $('#filter-product-ratio');
    if (!productRatioButton.length) return;

    const variant = resolveVariant(variantCandidate);
    const { size, label, color, ratio } = extractVariantMeta(variant);
    const wasActive = productRatioButton.hasClass('active');

    if (ratio) {
      productRatioButton
        .prop('disabled', false)
        .text(CURRENT_PRODUCT_FILTER_LABEL)
        .data('ratio', ratio);

      if (size) {
        productRatioButton
          .data('variantSize', size)
          .data('variant-size', size);
      } else {
        productRatioButton.removeData('variantSize').removeData('variant-size');
      }

      if (label) productRatioButton.data('variantLabel', label); else productRatioButton.removeData('variantLabel');
      if (color) productRatioButton.data('variantColor', color); else productRatioButton.removeData('variantColor');

      // MàJ nom produit depuis DOM si possible
      const freshLabel = readProductNameFromDom();
      if (freshLabel) productRatioButton.data('productName', freshLabel);

      // Si le filtre était déjà actif, synchroniser le label + format
      if (wasActive) {
        if (state.format !== ratio) {
          applyProductRatioFilter(ratio);
        } else {
          // Forcer size à s'afficher si dispo
          if (size) state.size = size;
          if (!state.productName) state.productName = productRatioButton.data('productName') || '';
          updateFormatLabel();
        }
      }
    } else {
      productRatioButton
        .prop('disabled', true)
        .removeClass('active')
        .text(CURRENT_PRODUCT_FILTER_LABEL)
        .removeData('productName')
        .removeData('variantLabel')
        .removeData('variantColor')
        .removeData('displayLabel')
        .removeData('ratio')
        .removeData('variantSize')
        .removeData('variant-size');

      if (wasActive && state.format !== 'all') {
        state.format = 'all';
        $('#open-format-menu').removeClass('active').text('Format');
        state.page = 1;
        renderFileList();
      }
    }
  }

  // -----------------------------
  // Communauté (search distante)
  // -----------------------------
  async function fetchCommunityImages(searchValue) {
    const params = new URLSearchParams({ limit: 200, offset: 0 });
    if (searchValue) params.append('search', searchValue);
    try {
      const res = await fetch(`${baseUrl}/wp-json/api/v1/images/load?${params.toString()}`);
      const data = await res.json();
      state.communityImages = (data && data.success && Array.isArray(data.images)) ? data.images : [];
      renderFileList(true);
    } catch (err) {
      console.error('❌ community search', err);
    }
  }

  // -----------------------------
  // Upload / Suppression
  // -----------------------------
  function activateImportedFolder() {
    if (state.folder !== 'imported') {
      state.folder = 'imported';
      state.page = 1;
      $('#folder-selector button').removeClass('active');
      $('#folder-imported').addClass('active');
    }
    resetAllFilters();
    $('#format-block').hide();
    renderFileList();
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  async function uploadImageFromLibrary(fileData) {
    if (typeof window.uploadFileToServer === 'function') {
      return window.uploadFileToServer(fileData);
    }
    try {
      const response = await fetch('/wp-json/customiizer/v1/upload-image/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fileData.url,
          name: fileData.name,
          size: fileData.size,
          user_id: currentUser.ID
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error('Upload failed');
      return true;
    } catch (error) {
      console.error('[Upload] Erreur serveur :', error);
      alert('Erreur lors du téléversement.');
      throw error;
    }
  }

  async function refreshImportedImages() {
    if (typeof window.fetchUserImages === 'function') {
      return window.fetchUserImages();
    }
    try {
      const response = await fetch(`/wp-json/customiizer/v1/user-images/?user_id=${currentUser.ID}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setImportedFiles(data);
      }
    } catch (error) {
      console.error('[UserImages] Erreur API :', error);
    }
  }

  async function handleFiles(files) {
    const imageFiles = files.filter(file => file.type && file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const dropZone = $('#fileDropZone');
    const dropzoneDefault = dropZone.find('.dropzone-default');
    const uploadFeedback = dropZone.find('.upload-feedback');
    const uploadFeedbackText = uploadFeedback.find('span');

    if (dropZone.data('isUploading')) return;
    dropZone.data('isUploading', true);

    dropZone.addClass('is-uploading').attr('aria-busy', 'true');
    dropzoneDefault.attr('aria-hidden', 'true');
    uploadFeedback.attr('aria-hidden', 'false');
    uploadFeedbackText.text(imageFiles.length > 1 ? 'Ajout des images…' : 'Ajout de l’image…');

    try {
      activateImportedFolder();
      let hasSuccess = false;

      for (const file of imageFiles) {
        try {
          const url = await readFileAsDataURL(file);
          const uploadResult = await uploadImageFromLibrary({ name: file.name, size: file.size, url });
          if (uploadResult) hasSuccess = true;
        } catch (_error) {/* déjà géré */}
      }
      if (hasSuccess) await refreshImportedImages();
    } finally {
      dropZone.removeClass('is-uploading').removeAttr('aria-busy');
      dropzoneDefault.attr('aria-hidden', 'false');
      uploadFeedback.attr('aria-hidden', 'true');
      dropZone.data('isUploading', false);
    }
  }

  async function deleteImportedImage(imageUrl) {
    if (imageUrl.startsWith('data:')) {
      state.importedImages = state.importedImages.filter(img => (img.url || img.image_url) !== imageUrl);
      renderFileList();
      return;
    }
    try {
      const response = await fetch('/wp-json/customiizer/v1/delete-image/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, user_id: currentUser.ID })
      });
      const result = await response.json();
      if (result.success) {
        state.importedImages = state.importedImages.filter(img => (img.url || img.image_url) !== imageUrl);
        renderFileList();
      } else {
        alert('Erreur lors de la suppression.');
      }
    } catch (error) {
      console.error('[Delete] Erreur serveur :', error);
      alert('Erreur lors de la suppression.');
    }
  }

  // -----------------------------
  // Init / Events
  // -----------------------------
  async function init(options) {
    state.myImages        = options?.my || [];
    state.communityImages = options?.community || [];
    state.importedImages  = options?.imported || [];

    // Formats visibles
    const formatBlock = $('#format-block');
    if (formatBlock.length) formatBlock.show();

    // Charger caches variantes si vide
    await ensureVariantCache();

    // Charger produits & binder la liste
    await loadProducts();

    // Synchroniser "Produit en cours" (nom + variant)
    const productRatioButton = $('#filter-product-ratio');

    // Nom produit depuis DOM
    const initialName = readProductNameFromDom();
    if (initialName) {
      productRatioButton.data('productName', initialName);
      state.productName = initialName; // utile pour label si on active "produit en cours"
    }

    // Observer le nom produit si change
    if (productRatioButton.length && typeof MutationObserver !== 'undefined') {
      const existingObserver = productRatioButton.data('productNameObserver');
      if (existingObserver && typeof existingObserver.disconnect === 'function') {
        existingObserver.disconnect();
      }
      const productNameElement = $('.product-name').first().get(0);
      if (productNameElement) {
        const observer = new MutationObserver(() => {
          const fresh = readProductNameFromDom();
          if (fresh) {
            productRatioButton.data('productName', fresh);
            if ($('#filter-product-ratio').hasClass('active') && state.format !== 'all') {
              state.productName = fresh;
              updateFormatLabel();
            }
          }
        });
        observer.observe(productNameElement, { childList: true, characterData: true, subtree: true });
        productRatioButton.data('productNameObserver', observer);
      }
    }

    // Si un variant actuel existe déjà, préremplir le bouton
    updateProductRatioButton(resolveVariant());

    // Dossiers
    $('#folder-my').on('click', function () {
      state.folder = 'my';
      state.page = 1;
      $('#folder-selector button').removeClass('active');
      $(this).addClass('active');
      $('#format-block').show();
      renderFileList();
    });
    $('#folder-community').on('click', function () {
      state.folder = 'community';
      state.page = 1;
      $('#folder-selector button').removeClass('active');
      $(this).addClass('active');
      $('#format-block').show();
      renderFileList();
    });
    $('#folder-imported').on('click', function () {
      state.folder = 'imported';
      state.page = 1;
      $('#folder-selector button').removeClass('active');
      $(this).addClass('active');
      resetAllFilters();
      $('#format-block').hide();
      renderFileList();
    });

    // Tri
    $('#sort-select').on('change', function () {
      state.sort = $(this).val();
      state.page = 1;
      renderFileList();
    });

    // Recherche
    $('#searchInput').on('input', function () {
      state.page = 1;
      const val = $(this).val();
      clearTimeout(state.searchTimer);
      if (state.folder === 'community') {
        state.searchTimer = setTimeout(() => fetchCommunityImages(val), 300);
      } else {
        renderFileList();
      }
    });

    // Filtre "Tous"
    $('#filter-all').on('click', function () {
      resetAllFilters();
      state.page = 1;
      renderFileList();
    });

    // Produit en cours
    if (productRatioButton.length) {
      productRatioButton.on('click', function () {
        if ($(this).prop('disabled')) return;
        const storedRatio = normalizeRatio($(this).data('ratio'));
        const variant = resolveVariant();
        const ratio = normalizeRatio(variant?.ratio_image) || storedRatio;
        if (!ratio) return;
        $(this).addClass('active');
        applyProductRatioFilter(ratio);
      });
    }

    // Ouverture menu format
    $('#open-format-menu').on('click', function (e) {
      e.stopPropagation();
      $('#formatOptions').toggleClass('active');
      $('#product-block').removeClass('active');
    });

    $(document).on('click', function (e) {
      if (!$(e.target).closest('#formatOptions, #open-format-menu').length) {
        $('#formatOptions').removeClass('active');
        $('#product-block').removeClass('active');
        $('#size-block').hide();
      }
    });

    // Formats standards (boutons dans #formatOptions)
    $('#formatOptions .format-btn').on('click', function () {
      const fmt = $(this).data('format');
      if (!fmt || fmt === 'product') return; // le bouton produit est géré à part
      state.format = fmt;
      state.productId = null;
      state.size = null;
      state.productFormats = [];
      state.sizeRatioMap = {};

      $('#formatOptions .format-btn').removeClass('active');
      $('#product-block button').removeClass('active');
      $('#sizeButtons').empty();
      $(this).addClass('active');
      $('#mainFormatFilters .format-main').removeClass('active');
      $('#open-format-menu').addClass('active');
      $('#product-block').removeClass('active');
      $('#size-block').hide();

      updateFormatLabel();
      state.page = 1;
      renderFileList();
      $('#formatOptions').removeClass('active');
    });

    // Accès Produits dans le menu format
    $('#format-product').on('click', function (e) {
      e.stopPropagation();
      $('#product-block').toggleClass('active');
    });

    // Drag & Drop upload
    const dropZone = $('#fileDropZone');
    const fileInput = $('#fileInput');

    dropZone.on('dragover', function (e) {
      e.preventDefault();
      dropZone.addClass('drag-over');
    });
    dropZone.on('dragleave', function () {
      dropZone.removeClass('drag-over');
    });
    dropZone.on('drop', async function (e) {
      e.preventDefault();
      dropZone.removeClass('drag-over');
      const files = Array.from(e.originalEvent.dataTransfer.files || []);
      await handleFiles(files);
    });

    dropZone.on('click', function (e) {
      if (e.target === fileInput[0]) return;
      fileInput.trigger('click');
    });

    fileInput.on('change', async function (e) {
      const files = Array.from(e.target.files || []);
      await handleFiles(files);
      fileInput.val('');
    });

    // Events externes
    $(document)
      .off('variantReady.fileLibrary')
      .on('variantReady.fileLibrary', function (_event, variant) {
        updateProductRatioButton(variant);
      });

    $(document)
      .off('productSelected.fileLibrary')
      .on('productSelected.fileLibrary', function () {
        const freshName = readProductNameFromDom();
        if (freshName) {
          state.productName = freshName;
          $('#filter-product-ratio').data('productName', freshName);
          if ($('#filter-product-ratio').hasClass('active') && state.format !== 'all') {
            updateFormatLabel();
          }
        }
      });

    // Premier rendu
    renderFileList();
  }

  // -----------------------------
  // API publique
  // -----------------------------
  function setImportedFiles(files) {
    state.importedImages = files || [];
    if (state.folder === 'imported') renderFileList();
  }
  function setMyImages(files) {
    state.myImages = files || [];
    if (state.folder === 'my') renderFileList();
  }
  function setCommunityImages(files) {
    state.communityImages = files || [];
    if (state.folder === 'community') renderFileList();
  }

  window.FileLibrary = {
    init,
    setImportedFiles,
    setMyImages,
    setCommunityImages,
    render: renderFileList,
    selectCurrentProductFormat: function () {
      // Active le ratio du variant courant, si trouvé
      const variant = resolveVariant();
      const ratio = normalizeRatio(variant?.ratio_image);
      if (!ratio) return false;
      applyProductRatioFilter(ratio);
      return true;
    },
    resetFilters: resetAllFilters
  };

  // Auto-init optionnel si des données sont exposées en global
  // (désactivé par défaut)

})(jQuery);
