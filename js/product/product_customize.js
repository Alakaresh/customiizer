window.currentProductId = window.currentProductId || null;
// Objet partagé pour mesurer les temps de génération de mockup
window.mockupTimes = window.mockupTimes || {};
window.skipDesignRestoreOnce = window.skipDesignRestoreOnce || false;

const AUTO_SAVE_DEBOUNCE_MS = 600;
const SIDEBAR_SIZE_SELECT_THRESHOLD = 6;
//const DATA_URL_PLACEHOLDER = window.CUSTOMIZER_DATA_URL_PLACEHOLDER || '__customizer_data_url_trimmed__';
let autoSaveTimeoutId = null;
let lastAutoSaveSignature = null;

(function bootstrapVariantColorNormalizer(global) {
  if (typeof global.resolveVariantColorAppearance === 'function') {
    return;
  }

  const tester = typeof document !== 'undefined' ? document.createElement('option') : null;

  function isValidCssColor(value) {
    if (!tester || !value) {
      return false;
    }
    tester.style.color = '';
    tester.style.color = value;
    return tester.style.color !== '';
  }

  function extractEmbeddedColor(value) {
    if (typeof value !== 'string') {
      return null;
    }
    const hexMatch = value.match(/#([0-9a-f]{3,8})/i);
    if (hexMatch && isValidCssColor(hexMatch[0])) {
      return hexMatch[0];
    }
    const rgbMatch = value.match(/rgba?\([^)]*\)/i);
    if (rgbMatch && isValidCssColor(rgbMatch[0])) {
      return rgbMatch[0];
    }
    return null;
  }

  function formatLabel(value) {
    if (!value) {
      return 'Couleur';
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  global.resolveVariantColorAppearance = function resolveVariantColorAppearance(rawColor) {
    const original = typeof rawColor === 'string' ? rawColor.trim() : '';
    const normalizedKey = original.toLowerCase();
    const cssColor =
      isValidCssColor(original) ? original : extractEmbeddedColor(original) || '#333333';

    return {
      cssColor,
      label: formatLabel(original || 'Couleur'),
      originalValue: rawColor,
      normalizedKey
    };
  };
})(window);

function isTrimmedPlaceholder(value) {
  return typeof value === 'string' && value === DATA_URL_PLACEHOLDER;
}

function getUsableUrl(value) {
  if (typeof value !== 'string') return null;
  if (!value) return null;
  if (isTrimmedPlaceholder(value)) return null;
  return value;
}

function sanitizeCanvasLayers(layers) {
  if (!Array.isArray(layers)) return [];
  return layers
    .map((layer) => {
      if (!layer || typeof layer !== 'object') return null;
      const clone = { ...layer };
      if (!clone.src || isTrimmedPlaceholder(clone.src)) {
        return null;
      }
      return clone;
    })
    .filter(Boolean);
}

function computeDesignSnapshotSignature(data) {
  if (!data || typeof data !== 'object') return null;
  try {
    const payload = {
      product_id: data.product_id ?? null,
      variant_id: data.variant_id ?? null,
      placement: data.placement ?? null,
      technique: data.technique ?? null,
      design_width: data.design_width ?? null,
      design_height: data.design_height ?? null,
      design_left: data.design_left ?? null,
      design_top: data.design_top ?? null,
      design_angle: data.design_angle ?? null,
      design_flipX: !!data.design_flipX,
      canvas_state: Array.isArray(data.canvas_state) ? data.canvas_state : []
    };
    return JSON.stringify(payload);
  } catch (err) {
    console.warn('[Autosave] signature computation failed', err);
    return null;
  }
}

function updateAutoSaveSignature(data) {
  const signature = computeDesignSnapshotSignature(data);
  if (signature) {
    lastAutoSaveSignature = signature;
  }
}

function cancelPendingDesignAutosave() {
  if (autoSaveTimeoutId) {
    clearTimeout(autoSaveTimeoutId);
    autoSaveTimeoutId = null;
  }
}

function persistDesignLocally(productData) {
  const productId = window.currentProductId;
  if (!productId || !productData || typeof productData !== 'object') {
    return null;
  }
  const payload = { ...productData };
  if (!payload.product_id && productId != null) {
    payload.product_id = String(productId);
  }

  if (window.DesignCache?.saveDesign) {
    try {
      window.DesignCache.saveDesign(productId, payload);
    } catch (err) {
      console.error('[Autosave] DesignCache.saveDesign failed', err);
    }
  } else if (window.customizerCache) {
    window.customizerCache.designs = window.customizerCache.designs || {};
    window.customizerCache.designs[productId] = payload;
    if (typeof persistCache === 'function') {
      try { persistCache(); } catch (err) { console.warn('[Autosave] persistCache failed', err); }
    }
  }

  return payload;
}

function getExistingDesignSnapshot(productId) {
  if (!productId) return null;
  if (window.DesignCache?.getLastDesign) {
    const cached = window.DesignCache.getLastDesign(productId);
    return cached ? { ...cached } : null;
  }
  const legacy = window.customizerCache?.designs?.[productId];
  return legacy ? { ...legacy } : null;
}

function cloneCanvasStateLayers(layers) {
  if (!Array.isArray(layers)) return [];
  try {
    return JSON.parse(JSON.stringify(layers));
  } catch (err) {
    return layers.map(layer => (layer && typeof layer === 'object') ? { ...layer } : layer);
  }
}

function collectCanvasSnapshotForAutosave() {
  const productId = window.currentProductId;
  if (!productId || !window.CanvasManager || typeof CanvasManager.exportState !== 'function') {
    return null;
  }

  let rawState = [];
  try {
    rawState = CanvasManager.exportState();
  } catch (err) {
    console.warn('[Autosave] exportState failed', err);
    return null;
  }
  const canvasState = cloneCanvasStateLayers(rawState);
  const hasLayers = Array.isArray(canvasState) && canvasState.length > 0;
  const existing = getExistingDesignSnapshot(productId);
  const hadCachedState = Array.isArray(existing?.canvas_state) && existing.canvas_state.length > 0;

  if (!hasLayers && !hadCachedState) {
    return null;
  }

  const payload = existing ? { ...existing } : {};
  payload.canvas_state = hasLayers ? canvasState : [];
  if (productId != null) {
    payload.product_id = String(productId);
  }

  if (typeof selectedVariant !== 'undefined' && selectedVariant && typeof selectedVariant === 'object') {
    if (selectedVariant.variant_id != null) {
      payload.variant_id = selectedVariant.variant_id;
    }
    const placementLabel = selectedVariant.placement || selectedVariant.zone_3d_name;
    if (placementLabel) {
      payload.placement = placementLabel;
    }
    if (selectedVariant.technique) {
      payload.technique = selectedVariant.technique;
    }
  }

  const bbox = (typeof CanvasManager.getClipWindowBBox === 'function')
    ? CanvasManager.getClipWindowBBox()
    : { left: 0, top: 0 };
  const placement = (typeof CanvasManager.getCurrentImageData === 'function')
    ? CanvasManager.getCurrentImageData()
    : null;

  if (hasLayers && placement) {
    payload.design_width = placement.width;
    payload.design_height = placement.height;
    payload.design_left = (placement.left != null ? placement.left - (bbox.left || 0) : 0);
    payload.design_top = (placement.top != null ? placement.top - (bbox.top || 0) : 0);
    payload.design_angle = placement.angle || 0;
    payload.design_flipX = !!placement.flipX;
  } else if (!hasLayers) {
    delete payload.design_width;
    delete payload.design_height;
    delete payload.design_left;
    delete payload.design_top;
    delete payload.design_angle;
    delete payload.design_flipX;
  }

  return payload;
}

function flushDesignAutosave(reason) {
  const snapshot = collectCanvasSnapshotForAutosave();
  if (!snapshot) return;
  const signature = computeDesignSnapshotSignature(snapshot);
  if (signature && signature === lastAutoSaveSignature) {
    return;
  }
  const stored = persistDesignLocally(snapshot) || snapshot;
  updateAutoSaveSignature(stored);
}

function scheduleDesignAutosave(reason) {
  if (!window.CanvasManager || typeof CanvasManager.exportState !== 'function') {
    return;
  }
  if (autoSaveTimeoutId) {
    clearTimeout(autoSaveTimeoutId);
  }
  autoSaveTimeoutId = setTimeout(() => {
    autoSaveTimeoutId = null;
    try {
      flushDesignAutosave(reason);
    } catch (err) {
      console.error('[Autosave] flush failed', err);
    }
  }, AUTO_SAVE_DEBOUNCE_MS);
}



jQuery(document).ready(function ($) {
        jQuery('#saveDesignButton').on('click', function () {
                // Démarre le suivi du temps dès le clic sur "Valider la personnalisation"
                window.mockupTimes.pending = Date.now();

                jQuery('#customizeModal').hide();

                if (typeof window.showLoadingOverlay === 'function') {
                        window.showLoadingOverlay();
                }

                const base64 = CanvasManager.exportPrintAreaPNG();
                const formData = new FormData();
                formData.append('action', 'generate_mockup');
                formData.append('image_base64', base64);
                formData.append('product_id', window.currentProductId || '');
                formData.append('variant_id', selectedVariant?.variant_id || '');
                formData.append('placement', selectedVariant?.placement || selectedVariant?.zone_3d_name || '');
                formData.append('technique', selectedVariant?.technique || '');
                formData.append('width', selectedVariant.print_area_width);
                formData.append('height', selectedVariant.print_area_height);
                formData.append('left', 0);
                formData.append('top', 0);
                const requestStart = Date.now();
                if (window.mockupTimes.pending) {
                        const delay = ((requestStart - window.mockupTimes.pending) / 1000).toFixed(1);                }
                window.mockupTimes.requestSent = requestStart;

                // Mise en cache locale de la personnalisation pour réouverture future
                const placement = CanvasManager.getCurrentImageData() || {};
                const canvasState = (typeof CanvasManager.exportState === 'function')
                        ? CanvasManager.exportState()
                        : [];
                const bbox = (typeof CanvasManager.getClipWindowBBox === 'function')
                        ? CanvasManager.getClipWindowBBox()
                        : { left: 0, top: 0 };
                const productData = {
                        product_name: jQuery('.product-name').text().trim(),
                        product_price: selectedVariant.price,
                        delivery_price: selectedVariant?.delivery_price,
                        mockup_url: '',
                        design_image_url: base64,
                        canvas_image_url: base64,
                        design_width: placement.width || selectedVariant.print_area_width,
                        design_height: placement.height || selectedVariant.print_area_height,
                        design_left: (placement.left != null ? placement.left - bbox.left : 0),
                        design_top: (placement.top != null ? placement.top - bbox.top : 0),
                        design_angle: placement.angle || 0,
                        design_flipX: placement.flipX || false,
                        variant_id: selectedVariant?.variant_id,
                        placement: selectedVariant?.placement || selectedVariant?.zone_3d_name || '',
                        technique: selectedVariant?.technique || '',
                        product_id: window.currentProductId != null ? String(window.currentProductId) : null,
                        canvas_state: Array.isArray(canvasState) ? canvasState : []
                };
                cancelPendingDesignAutosave();
                const savedBeforeRequest = persistDesignLocally(productData) || productData;
                updateAutoSaveSignature(savedBeforeRequest);

                const firstViewName = getFirstMockup(selectedVariant)?.view_name;

                fetch(ajaxurl, { method: 'POST', body: formData })
                        .then(res => res.json())
                        .then(data => {
                                if (data.data?.timings) {                                }

                                if (data.success && Array.isArray(data.data?.files)) {
                                        window.mockupTimes.pending = null;
                                        const designFile = data.data.files.find(f => f.name === 'design');
                                        const mockupFile = data.data.files.find(f => f.name !== 'design' && f.name !== 'texture') || data.data.files[0];
                                        if (designFile) {
                                                productData.design_image_url = designFile.base64 || designFile.url;
                                        }
                                        if (mockupFile) {
                                                productData.mockup_url = mockupFile.base64 || mockupFile.url;
                                        }
                                        data.data.files
                                                .filter(f => f.name !== 'texture')
                                                .forEach(f => updateMockupThumbnail(f.name, f.base64 || f.url));

                                } else if (data.success && data.data?.url && firstViewName) {
                                        window.mockupTimes.pending = null;
                                        productData.mockup_url = data.data.url;
                                        updateMockupThumbnail(firstViewName, data.data.url);
                                } else if (data.success && data.data?.mockup_url && firstViewName) {
                                        window.mockupTimes.pending = null;
                                        productData.mockup_url = data.data.mockup_url;
                                        updateMockupThumbnail(firstViewName, data.data.mockup_url);
                                } else {
                                        alert("Erreur lors de la génération du mockup");
                                }
                                cancelPendingDesignAutosave();
                                const savedAfterRequest = persistDesignLocally(productData) || productData;
                                updateAutoSaveSignature(savedAfterRequest);
                        })
                        .catch(err => {
                                console.error("❌ Erreur réseau :", err.message);
                        })
                        .finally(() => {
                                if (typeof window.hideLoadingOverlay === 'function') {
                                        window.hideLoadingOverlay();
                                }
                        });

        });
});

jQuery(document).ready(function ($) {

        let importedFiles = [];

        const customizeButton = $('.design-button');
        const customizeModal = $('#customizeModal');
        const closeButtonMain = $('#customizeModal .close-button');
        const addImageButton = $('#addImageButton');
        const imageSourceModal = $('#imageSourceModal');
        const closeButtonImageModal = $('#imageSourceModal .close-button');
        const uploadPcImageButton = $('#uploadPcImageButton');

        window.addEventListener('canvas:image-change', () => scheduleDesignAutosave('canvas-event'));

        // Assurer la sauvegarde avant de quitter la page
        window.addEventListener('beforeunload', function () {
                cancelPendingDesignAutosave();
                try {
                        flushDesignAutosave('beforeunload');
                } catch (err) {
                        console.warn('[Autosave] flush beforeunload failed', err);
                }
        });

        const alignLeftButton = $('#alignLeftButton');
        const alignCenterButton = $('#alignCenterButton');
        const alignRightButton = $('#alignRightButton');
        const alignTopButton = $('#alignTopButton');
        const alignMiddleButton = $('#alignMiddleButton');
        const alignBottomButton = $('#alignBottomButton');
        const rotateLeftButton = $('#rotateLeftButton');
        const rotateRightButton = $('#rotateRightButton');
        const mirrorImageButton = $('#mirrorImageButton');
        const bringForwardButton = $('#bringForwardButton');
        const sendBackwardButton = $('#sendBackwardButton');
        const removeImageButton = $('#removeImageButton');
        const imageControls = $('.image-controls');
        const visualHeader = $('.visual-header');
        const sidebarChangeProductButton = $('#sidebarChangeProductButton');
        const sidebarAddImageButton = $('#sidebarAddImageButton');
        const productSidebar = $('#product-sidebar');
        const hideProductSidebarButton = $('#hideProductSidebar');
        let sidebarVariants = [];
        let threeDInitialized = false;
        let hasAppliedInitialFormatFilter = false;

        FileLibrary.init({
                my: typeof myGeneratedImages !== 'undefined' ? myGeneratedImages : [],
                community: typeof communityImages !== 'undefined' ? communityImages : [],
                imported: importedFiles
        });

        function trapFocus(modal) {
                const focusable = modal.find('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');
                if (!focusable.length) return;
                const first = focusable.first();
                const last = focusable.last();
                modal.on('keydown.trapFocus', function (e) {
                        if (e.key === 'Tab') {
                                if (e.shiftKey) {
                                        if ($(document.activeElement).is(first)) {
                                                last.focus();
                                                e.preventDefault();
                                        }
                                } else {
                                        if ($(document.activeElement).is(last)) {
                                                first.focus();
                                                e.preventDefault();
                                        }
                                }
                        }
                });
                first.focus();
        }

       function releaseFocus(modal) {
               modal.off('keydown.trapFocus');
       }
       window.releaseFocus = releaseFocus;

       function updateAddImageButtonVisibility() {
               if (CanvasManager.hasImage()) {
                       addImageButton.hide();
                       visualHeader.css('display', 'flex');
                       $('.visual-zone').addClass('with-header');
                       imageControls.css('display', 'flex').show();
                       CanvasManager.resizeToContainer('product2DContainer');
               } else {
                       addImageButton.show();
                       imageControls.hide();
                       visualHeader.css('display', 'none');
                       $('.visual-zone').removeClass('with-header');
                       CanvasManager.resizeToContainer('product2DContainer');
               }
       }
       window.updateAddImageButtonVisibility = updateAddImageButtonVisibility;


       async function restoreLastDesignToCanvas(done) {
               const finish = (value) => {
                       if (typeof done === 'function') done(value);
                       scheduleDesignAutosave('restore-finish');
               };

               try {
                       if (!window.CanvasManager || typeof CanvasManager.addImage !== 'function') {
                               finish(false);
                               return;
                       }

                       if (typeof CanvasManager.hasImage === 'function' && CanvasManager.hasImage()) {
                               finish(true);
                               return;
                       }

                      let designData = null;
                      if (window.DesignCache?.getLastDesign) {
                               designData = window.DesignCache.getLastDesign(window.currentProductId);
                      } else if (window.customizerCache?.designs?.[window.currentProductId]) {
                               designData = window.customizerCache.designs[window.currentProductId];
                      }

                      let usableDesignUrl = null;
                      let usableCanvasUrl = null;
                      let usableMockupUrl = null;

                      if (designData && typeof designData === 'object') {
                               designData = { ...designData };
                               usableDesignUrl = getUsableUrl(designData.design_image_url);
                               usableCanvasUrl = getUsableUrl(designData.canvas_image_url);
                               usableMockupUrl = getUsableUrl(designData.mockup_url);

                               designData.design_image_url = usableDesignUrl;
                               designData.canvas_image_url = usableCanvasUrl || usableDesignUrl || null;
                               if (usableMockupUrl !== null || isTrimmedPlaceholder(designData.mockup_url)) {
                                       designData.mockup_url = usableMockupUrl;
                               }
                      }

                      if (!designData) {
                               finish(false);
                               return;
                      }

                       const cachedProductId = designData.product_id != null ? String(designData.product_id) : null;
                       const currentProductId = window.currentProductId != null ? String(window.currentProductId) : null;
                       if (cachedProductId && currentProductId && cachedProductId !== currentProductId) {
                               finish(false);
                               return;
                       }

                       const currentVariantId = selectedVariant?.variant_id != null ? String(selectedVariant.variant_id) : null;
                       const cachedVariantId = designData.variant_id != null ? String(designData.variant_id) : null;
                       if (cachedVariantId && currentVariantId && cachedVariantId !== currentVariantId) {
                               finish(false);
                               return;
                       }

                      const stateLayers = sanitizeCanvasLayers(designData.canvas_state);
                      if (stateLayers.length && typeof CanvasManager.restoreState === 'function') {
                               CanvasManager.clearUserImages();
                               const failedLayers = [];
                               try {
                                       const { restored, failed } = await CanvasManager.restoreState(stateLayers, {
                                               onLayerError: (layer, error) => {
                                                       failedLayers.push({ layer, error });
                                               }
                                       });
                                       if (failed > 0) {
                                               const message = "Certaines images de votre personnalisation n’ont pas pu être rechargées automatiquement.";
                                               if (typeof window.showToast === 'function') {
                                                       window.showToast(message);
                                               } else if (typeof window.displayMessage === 'function') {
                                                       window.displayMessage(message);
                                               } else {
                                                       console.warn('[Restore] canvas_state layer(s) failed', failedLayers);
                                               }
                                       }
                                       if (restored > 0) {
                                               finish(true);
                                               return;
                                       }
                               } catch (err) {
                                       console.error('[Restore] Failed to rebuild canvas_state', err);
                               }
                       }

                      if (!usableCanvasUrl && designData.canvas_image_url) {
                               usableCanvasUrl = getUsableUrl(designData.canvas_image_url);
                      }
                      if (!usableDesignUrl && designData.design_image_url) {
                               usableDesignUrl = getUsableUrl(designData.design_image_url);
                      }
                      const preferredUrl = usableCanvasUrl || usableDesignUrl;
                      const renderUrl = (preferredUrl && usableMockupUrl && preferredUrl === usableMockupUrl) ? null : preferredUrl;
                      if (!renderUrl) {
                               finish(false);
                               return;
                      }

                      let placement = null;
                      if (window.DesignCache?.getPlacement) {
                               placement = window.DesignCache.getPlacement(
                                       window.currentProductId,
                                       renderUrl,
                                       selectedVariant?.variant_id
                               );

                               if (!placement && usableDesignUrl && usableDesignUrl !== renderUrl) {
                                       placement = window.DesignCache.getPlacement(
                                               window.currentProductId,
                                               usableDesignUrl,
                                               selectedVariant?.variant_id
                                       );
                               }

                               if (!placement && usableCanvasUrl && usableCanvasUrl !== renderUrl) {
                                       placement = window.DesignCache.getPlacement(
                                               window.currentProductId,
                                               usableCanvasUrl,
                                               selectedVariant?.variant_id
                                       );
                               }
                      }

                       const finalize = () => {
                               finish(true);
                       };

                       if (placement && typeof placement === 'object') {
                               const mergedPlacement = { ...placement };
                               if (mergedPlacement.design_width == null && designData.design_width != null) {
                                       mergedPlacement.design_width = designData.design_width;
                               }
                               if (mergedPlacement.design_height == null && designData.design_height != null) {
                                       mergedPlacement.design_height = designData.design_height;
                               }
                               if (mergedPlacement.design_left == null && designData.design_left != null) {
                                       mergedPlacement.design_left = designData.design_left;
                               }
                               if (mergedPlacement.design_top == null && designData.design_top != null) {
                                       mergedPlacement.design_top = designData.design_top;
                               }
                               if (mergedPlacement.design_angle == null && designData.design_angle != null) {
                                       mergedPlacement.design_angle = designData.design_angle;
                               }
                               if (typeof mergedPlacement.design_flipX === 'undefined' && typeof designData.design_flipX !== 'undefined') {
                                       mergedPlacement.design_flipX = designData.design_flipX;
                               }
                               CanvasManager.addImage(renderUrl, { placement: mergedPlacement }, finalize);
                               return;
                       }

                       const canRestoreFromProduct = typeof CanvasManager.restoreFromProductData === 'function'
                               && (!cachedVariantId || !currentVariantId || cachedVariantId === currentVariantId);

                       if (canRestoreFromProduct) {
                               const payload = {
                                       ...designData,
                                       design_image_url: renderUrl,
                                       variant_id: selectedVariant?.variant_id || designData.variant_id
                               };
                               CanvasManager.restoreFromProductData(payload, finalize);
                               return;
                       }

                       finish(false);
               } catch (error) {
                       console.error('[Restore] Unexpected error while restoring design', error);
                       finish(false);
               }
       }


       function renderSidebarOptions(variants, preselect) {

               const colorsContainer = productSidebar.find('.colors-container').empty();
               const sizesContainer = productSidebar.find('.sizes-container').empty();
               sizesContainer.removeClass('sizes-select-mode');

               const colorSet = new Set();
               variants.forEach(v => { if (v.color) colorSet.add(v.color); });

               Array.from(colorSet).forEach((color, idx) => {
                       const appearance = typeof window.resolveVariantColorAppearance === 'function'
                               ? window.resolveVariantColorAppearance(color)
                               : { cssColor: color, label: color };
                       const disabled = !variants.some(v => v.color === color && v.stock !== 'out of stock' && v.stock !== 'discontinued');
                       const opt = $('<div>').addClass('color-option')
                               .css('background-color', appearance.cssColor)
                               .attr('data-color', color)
                               .attr('title', appearance.label)
                               .attr('aria-label', appearance.label)
                               .toggleClass('disabled', disabled)
                               .on('click', function () {
                                       if ($(this).hasClass('disabled')) return;
                                       productSidebar.find('.color-option').removeClass('selected');
                                       $(this).addClass('selected');
                                       updateSidebarSelectedVariant();
                               });
                       colorsContainer.append(opt);
                       const shouldSelect = preselect ? preselect.color === color : idx === 0;
                       if (shouldSelect && !disabled) opt.addClass('selected');
               });

               const seenSizes = new Set();
               const orderedSizes = [];
               variants.forEach(v => {
                       if (v.size && !seenSizes.has(v.size)) {
                               seenSizes.add(v.size);
                               orderedSizes.push({ size: v.size, stock: v.stock });
                       }
               });
               const shouldUseSelect = orderedSizes.length > SIDEBAR_SIZE_SELECT_THRESHOLD;

               if (shouldUseSelect) {
                       sizesContainer.addClass('sizes-select-mode');
                       const selectWrapper = $('<div>').addClass('size-select-wrapper');
                       const selectElement = $('<select>').addClass('size-selector');

                       const placeholder = $('<option>')
                               .val('')
                               .text('Sélectionner une taille')
                               .prop('disabled', true)
                               .prop('hidden', true);
                       selectElement.append(placeholder);

                       orderedSizes.forEach(({ size, stock }) => {
                               const isDisabled = stock === 'out of stock' || stock === 'discontinued';
                               const option = $('<option>')
                                       .val(size)
                                       .text(size)
                                       .attr('data-size', size);

                               if (isDisabled) option.prop('disabled', true);
                               selectElement.append(option);
                       });

                       let defaultSize = preselect ? preselect.size : null;
                       if (defaultSize) {
                               const preferredEntry = orderedSizes.find(entry => entry.size === defaultSize);
                               if (preferredEntry && (preferredEntry.stock === 'out of stock' || preferredEntry.stock === 'discontinued')) {
                                       defaultSize = null;
                               }
                       }

                       if (!defaultSize) {
                               const firstAvailable = orderedSizes.find(({ stock }) => stock !== 'out of stock' && stock !== 'discontinued');
                               if (firstAvailable) defaultSize = firstAvailable.size;
                       }

                       if (defaultSize) {
                               selectElement.val(defaultSize);
                       }

                       selectElement.on('change', function () {
                               if (!$(this).val()) return;
                               updateSidebarSelectedVariant();
                       });

                       selectWrapper.append(selectElement);
                       sizesContainer.append(selectWrapper);
               } else {
                       // Ancien affichage avec des boutons taille
                       orderedSizes.forEach(({ size, stock }, idx) => {
                               const opt = $('<div>').addClass('size-option')
                                       .text(size)
                                       .attr('data-size', size)
                                       .toggleClass('disabled', stock === 'out of stock' || stock === 'discontinued')
                                       .on('click', function () {
                                               if ($(this).hasClass('disabled')) return;
                                               productSidebar.find('.size-option').removeClass('selected');
                                               $(this).addClass('selected');
                                               updateSidebarSelectedVariant();
                                       });
                               sizesContainer.append(opt);
                               const shouldSelect = preselect ? preselect.size === size : idx === 0;
                               if (shouldSelect && !opt.hasClass('disabled')) opt.addClass('selected');

                       });
               }

               if (colorSet.size <= 1) {
                       productSidebar.find('.product-colors').hide();
               } else {
                       productSidebar.find('.product-colors').show();
               }

       }

       async function loadVariantInCustomizer(variant) {
               try {
                       let template = window.customizerCache.templates[variant.variant_id];
                       if (!template) {
                               const res = await fetch(`/wp-json/custom-api/v1/variant-template/${variant.variant_id}`);
                               const data = await res.json();
                               if (!data.success || !data.template) {
                                       console.error('[UI] template not found for variant', variant.variant_id);
                                       return;
                               }
                               template = data.template;
                               window.customizerCache.templates[variant.variant_id] = template;
                       }
                       CanvasManager.init(template, 'product2DContainer');
                       updateAddImageButtonVisibility();
                       if (variant.url_3d) {
                               $('#product3DContainer').show();
                               init3DScene('product3DContainer', variant.url_3d, 'threeDCanvas');
                               threeDInitialized = true;
                       } else {
                               $('#product3DContainer').hide();
                       }
               } catch (e) {
                       console.error('[Sidebar] failed to load variant template', e);
               }
       }

       function updateSidebarSelectedVariant() {
               const selectedColor = productSidebar.find('.color-option.selected').attr('data-color');
               const sizeSelector = productSidebar.find('.size-selector');
               const selectedSizeFromSelect = sizeSelector.length ? sizeSelector.val() : null;
               const selectedSize = productSidebar.find('.size-option.selected').attr('data-size') || selectedSizeFromSelect;
               const variant = sidebarVariants.find(v =>
                       (!selectedColor || v.color === selectedColor) &&
                       (!selectedSize || v.size === selectedSize)
               );
               if (variant) {
                       selectedVariant = variant;
                       if (sizeSelector.length && variant.size) {
                               sizeSelector.val(variant.size);
                       }
                       loadVariantInCustomizer(variant);
                       $(document).trigger('variantReady', [variant]);
                       productSidebar.removeClass('open');

                       if (typeof window.applyVariantSelection === 'function') {
                               window.applyVariantSelection(variant);
                       }

                       const mainImage = $('#product-main-image');
                       if (mainImage.length) {
                               $('#footerProductImage').attr('src', mainImage.attr('src'));
                       }

                       const updatedPrice = $('.price-value span').text().trim();
                       if (updatedPrice) {
                               customizeModal.find('.summary-price').text(updatedPrice);
                       }
               }
       }

        // 2) Ouvrir le modal de personnalisation
        customizeButton.on('click', async function (event) {
                threeDInitialized = false;
                fetchUserImages(); // images perso si besoin
                customizeModal.show();
                const productImageSrc = jQuery("#product-main-image").attr("src");
                jQuery("#footerProductImage").attr("src", productImageSrc);
                const productName = jQuery(".product-name").text().trim();
                jQuery("#customizeModalTitle").text(productName);
                jQuery(".summary-name").text(productName);
                const productPrice = jQuery(".price-value span").text().trim();
                jQuery(".summary-price").text(productPrice);
                imageControls.hide();
                visualHeader.css('display', 'none');
                $('.visual-zone').removeClass('with-header');
                trapFocus(customizeModal);

                const shouldSkipRestore = !!window.skipDesignRestoreOnce;
                window.skipDesignRestoreOnce = false;

                try {
                        // 1. Charger le template depuis le cache ou l'API
                        let template = window.customizerCache.templates[selectedVariant.variant_id];
                        if (!template) {
                                const res = await fetch(`/wp-json/custom-api/v1/variant-template/${selectedVariant.variant_id}`);
                                const data = await res.json();

                                if (!data.success || !data.template) {
                                        console.error("[UI] ❌ Template introuvable pour la variante", selectedVariant.variant_id);
                                        $('#product2DContainer').html('<p style="color:red;">Template non disponible</p>');
                                        return;
                                }

                                template = data.template;
                                window.customizerCache.templates[selectedVariant.variant_id] = template;
                        } else {
                        }

                        // 2. Lancer Fabric.js dans le container
                        CanvasManager.init(template, 'product2DContainer');
                        updateAddImageButtonVisibility();
                        if (!shouldSkipRestore) {
                                const restorePromise = restoreLastDesignToCanvas();
                                if (restorePromise && typeof restorePromise.catch === 'function') {
                                        restorePromise.catch(err => console.error('[Restore] restoreLastDesignToCanvas failed', err));
                                }
                        }
                        // La personnalisation est restaurée automatiquement lors d'une ouverture manuelle.

                        // 3. Lancer Three.js si disponible
                        if (selectedVariant.url_3d) {
                                $('#product3DContainer').show();
                                init3DScene('product3DContainer', selectedVariant.url_3d, 'threeDCanvas');
                                threeDInitialized = true;
                        } else {
                                $('#product3DContainer').hide();
                        }
		} catch (error) {
			console.error("[UI] ❌ Erreur de chargement template :", error);
		}
	});


        // 3) Fermer le modal principal
        closeButtonMain.on('click', function () {
                cancelPendingDesignAutosave();
                try {
                        flushDesignAutosave('modal-close');
                } catch (err) {
                        console.warn('[Autosave] flush modal-close failed', err);
                }
                customizeModal.hide();
                releaseFocus(customizeModal);
                updateAddImageButtonVisibility();
        });

        // Afficher le bouton lors du changement de produit
        $(document).on('productSelected', function () {
                updateAddImageButtonVisibility();
        });

        // Mise à jour initiale quand la variante est prête
        $(document).on('variantReady', function () {
                updateAddImageButtonVisibility();
        });

	// 4) Ouvrir le sélecteur d’image
        function openImageModal() {
                if (!hasAppliedInitialFormatFilter && window.FileLibrary && typeof window.FileLibrary.selectCurrentProductFormat === 'function') {
                        const applied = window.FileLibrary.selectCurrentProductFormat();
                        if (applied) {
                                hasAppliedInitialFormatFilter = true;
                        }
                }

                imageSourceModal.show();
                trapFocus(imageSourceModal);
        }

        addImageButton.on('click', openImageModal);

        sidebarAddImageButton.on('click', openImageModal);

        async function openProductSidebar() {
                try {
                        let data;
                        if (window.customizerCache?.variants?.[window.currentProductId]) {
                                data = window.customizerCache.variants[window.currentProductId];
                        } else {
                                const res = await fetch(`/wp-json/api/v1/products/${window.currentProductId}`);
                                data = await res.json();
                                if (window.customizerCache) {
                                        window.customizerCache.variants[window.currentProductId] = data;
                                }
                        }
                        sidebarVariants = Array.isArray(data.variants) ? data.variants : [];
                        renderSidebarOptions(sidebarVariants, selectedVariant);
                        productSidebar.addClass('open');
                } catch (e) {
                        console.error('[Sidebar] Failed to load variants', e);
                }
        }

        sidebarChangeProductButton.on('click', function () {
                openProductSidebar();
        });

        hideProductSidebarButton.on('click', function () {
                productSidebar.removeClass('open');
        });

        // 5) Fermer le sélecteur d’image
        closeButtonImageModal.on('click', function () {
                imageSourceModal.hide();
                releaseFocus(imageSourceModal);
        });

        // Les interactions de la bibliothèque (tri, recherche, vue et sélection des images)
        // sont gérées par file_library.js

        alignLeftButton.on('click', function () {
                CanvasManager.alignImage('left');
        });
        alignCenterButton.on('click', function () {
                CanvasManager.alignImage('center');
        });
        alignRightButton.on('click', function () {
                CanvasManager.alignImage('right');
        });
        alignTopButton.on('click', function () {
                CanvasManager.alignImage('top');
        });
        alignMiddleButton.on('click', function () {
                CanvasManager.alignImage('middle');
        });
        alignBottomButton.on('click', function () {
                CanvasManager.alignImage('bottom');
        });
        mirrorImageButton.on('click', function () {
                CanvasManager.mirrorImage();
        });
        rotateLeftButton.on('click', function () {
                CanvasManager.rotateImage(-90);
        });
        rotateRightButton.on('click', function () {
                CanvasManager.rotateImage(90);
        });
        bringForwardButton.on('click', function () {
                CanvasManager.bringImageForward();
        });
        sendBackwardButton.on('click', function () {
                CanvasManager.sendImageBackward();
        });

        removeImageButton.on('click', function () {
                CanvasManager.removeImage();
                updateAddImageButtonVisibility();
        });

        $(document).on('keydown', function (e) {
                if (e.key === 'Escape') {
                        if (imageSourceModal.is(':visible')) {
                                imageSourceModal.hide();
                                releaseFocus(imageSourceModal);
                        } else if (productSidebar.hasClass('open')) {
                                productSidebar.removeClass('open');
                        } else if (customizeModal.is(':visible')) {
                                closeButtonMain.trigger('click');
                        }
                }

                if (e.key === 'Delete' && customizeModal.is(':visible')) {
                        CanvasManager.removeImage();
                        updateAddImageButtonVisibility();
                }
        });


        async function fetchUserImages() {
                try {
                        const response = await fetch(`/wp-json/customiizer/v1/user-images/?user_id=${currentUser.ID}`);
                        const data = await response.json();

                        if (Array.isArray(data)) {
                                importedFiles = data;
                                FileLibrary.setImportedFiles(importedFiles);
                        }

                        return data;
                } catch (error) {
                        console.error("[UserImages] Erreur API :", error);
                        return null;
                }
        }

        if (typeof window !== 'undefined') {
                window.fetchUserImages = fetchUserImages;
        }

	uploadPcImageButton.on('click', function () {
		const input = $('<input type="file" accept="image/png, image/jpeg">');
		input.on('change', async function (e) {
			const file = e.target.files[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = async function (evt) {
				await uploadFileToServer({
					name: file.name,
					size: file.size,
					url: evt.target.result
				});
			};
			reader.readAsDataURL(file);
		});
		input.click();
	});

        async function uploadFileToServer(fileData) {
                try {
                        const response = await fetch("/wp-json/customiizer/v1/upload-image/", {
                                method: 'POST',
                                headers: {
                                        'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                        url: fileData.url,
                                        name: fileData.name,
                                        size: fileData.size,
                                        user_id: currentUser.ID
                                })
                        });

                        const result = await response.json();
                        if (result.success) {
                                await fetchUserImages();
                                return true;
                        }

                        alert("Erreur lors du téléversement.");
                        return false;
                } catch (error) {
                        console.error("[Upload] Erreur serveur :", error);
                        alert("Erreur lors du téléversement.");
                        return false;
                }
        }

        if (typeof window !== 'undefined') {
                window.uploadFileToServer = uploadFileToServer;
        }

        // La recherche est gérée par file_library.js
});
