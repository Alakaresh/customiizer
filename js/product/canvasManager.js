// 📁 canvasManager.js — BG + clipPath (image_path) + API UI + logs + resize “visible-only”

let canvas = null;
let template = null;
let bgImage = null;       // Image de fond (template)
let maskPath = null;      // Clip path (image_path), NON ajouté à la scène
let resizeObserver = null;

// Mémo du conteneur pour resize public
let _containerId = null;

// Promesses de readiness (BG + masque) pour éviter les courses
let _bgReadyResolve, _maskReadyResolve;
let bgReady = new Promise(r => (_bgReadyResolve = r));
let maskReady = new Promise(r => (_maskReadyResolve = r));

// ----- DEBUG LOGS -----
let DEBUG = true; // passe à false en prod si besoin
const CM = {
  log: (...a)   => { if (DEBUG) { /* log désactivé */ } },
  warn: (...a)  => { if (DEBUG) console.warn("[CanvasManager]", ...a); },
  error: (...a) => console.error("[CanvasManager]", ...a),
};

// =============================
// Helpers
// =============================

// Attendre que le conteneur soit VISIBLE (dimensions > 0) avant de calculer le zoom
function waitForContainerSize(containerId, cb, { attempts = 80, interval = 50 } = {}) {
  let tries = 0;
  (function check() {
    const el = document.getElementById(containerId);
    const w = el?.clientWidth  || 0;
    const h = el?.clientHeight || 0;
    const visible = !!el && (el.offsetParent !== null || (w > 0 && h > 0));

    if (el && w > 0 && h > 0 && visible) {
      requestAnimationFrame(() => cb(el));
    } else if (++tries < attempts) {
      setTimeout(check, interval);
    } else {
      CM.warn('waitForContainerSize: timeout', { w, h, attempts, interval });
      cb(el || null);
    }
  })();
}

// Fallback DOM (scopé au modal) — cache/affiche bouton + outils + classe CSS
function toggleUI(hasImage) {
  const root   = document.getElementById('customizeModal') || document;
  const addBtn = root.querySelector('#addImageButton');
  const header = root.querySelector('.visual-header');
  const tools  = root.querySelector('.image-controls');

  // Classe globale pour CSS (montre header / cache bouton)
  if (root.id === 'customizeModal') {
    root.classList.toggle('has-user-image', !!hasImage);
  }

  // Bouton
  if (addBtn) {
    addBtn.toggleAttribute('hidden', hasImage);
    addBtn.setAttribute('aria-hidden', hasImage ? 'true' : 'false');
    addBtn.style.setProperty('display', hasImage ? 'none' : '', 'important');
  }
  // Header
  if (header) {
    header.style.setProperty('display', hasImage ? 'flex' : 'none', 'important');
    header.style.setProperty('visibility', hasImage ? 'visible' : 'hidden', 'important');
    header.style.setProperty('opacity', hasImage ? '1' : '0', 'important');
    header.style.setProperty('pointer-events', hasImage ? 'auto' : 'none', 'important');
  }
  // Toolbar
  if (tools) {
    tools.style.setProperty('display', hasImage ? 'flex' : 'none', 'important');
    tools.style.setProperty('visibility', hasImage ? 'visible' : 'hidden', 'important');
    tools.style.setProperty('opacity', hasImage ? '1' : '0', 'important');
    tools.style.setProperty('pointer-events', hasImage ? 'auto' : 'none', 'important');
  }
}

// Harmonise la remontée d'un changement manuel pour profiter des listeners Fabric
function emitObjectModified(target, reason = 'manual-update') {
  if (!canvas || !target) { return; }
  try {
    canvas.fire('object:modified', { target, reason });
    CM.log('emitObjectModified', reason);
  } catch (err) {
    CM.warn('emitObjectModified KO', err);
  }
}

// notifyChange : évènements + compat UI + fallback DOM
function notifyChange(src = 'unknown') {
  const hasImage = CanvasManager.hasImage ? CanvasManager.hasImage() : false;
  const activeObj = canvas?.getActiveObject();
  const hasActiveImage = !!(activeObj && activeObj.type === 'image' && activeObj !== bgImage);

  CM.log('notifyChange from', src, { hasImage, hasActiveImage, activeType: activeObj?.type });

  // 1) CustomEvent natif
  try {
    window.dispatchEvent(new CustomEvent('canvas:image-change', { detail: { hasImage, hasActiveImage } }));
    CM.log('notifyChange: CustomEvent dispatch OK');
  } catch (e) { CM.warn('notifyChange: CustomEvent KO', e); }

  // 2) jQuery si présent
  try {
    if (window.jQuery) {
      window.jQuery(document).trigger('canvas:image-change', [{ hasImage, hasActiveImage }]);
      CM.log('notifyChange: jQuery trigger OK');
    } else {
      CM.log('notifyChange: jQuery non détecté');
    }
  } catch (e) { CM.warn('notifyChange: jQuery trigger KO', e); }

  // 3) Compat : fonction UI globale si dispo
  try {
    if (typeof window.updateAddImageButtonVisibility === 'function') {
      CM.log('notifyChange: call window.updateAddImageButtonVisibility()');
      window.updateAddImageButtonVisibility();
    } else {
      CM.log('notifyChange: window.updateAddImageButtonVisibility ABSENTE');
    }
  } catch (e) { CM.warn('notifyChange: call updateAddImageButtonVisibility KO', e); }

  // 4) Fallback DOM
  try { toggleUI(hasImage); } catch (e) { CM.warn('notifyChange: toggleUI KO', e); }
}

const INITIAL_PLACEMENT_KEY = '__customizerInitialPlacement';

function toFiniteNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function captureImagePlacementSnapshot(image) {
  if (!image) return null;
  return {
    left: toFiniteNumber(image.left, 0),
    top: toFiniteNumber(image.top, 0),
    scaleX: toFiniteNumber(image.scaleX, 1),
    scaleY: toFiniteNumber(image.scaleY, 1),
    angle: toFiniteNumber(image.angle, 0),
    flipX: !!image.flipX,
    flipY: !!image.flipY,
    skewX: toFiniteNumber(image.skewX, 0),
    skewY: toFiniteNumber(image.skewY, 0),
    originX: image.originX || 'left',
    originY: image.originY || 'top',
    opacity: typeof image.opacity === 'number' ? image.opacity : undefined,
  };
}

function rememberInitialPlacement(image) {
  if (!image) return null;
  const snapshot = captureImagePlacementSnapshot(image);
  if (snapshot) {
    image[INITIAL_PLACEMENT_KEY] = snapshot;
  }
  return snapshot;
}

function applyImagePlacementSnapshot(image, snapshot) {
  if (!image || !snapshot) return false;
  try {
    image.set({
      left: toFiniteNumber(snapshot.left, image.left || 0),
      top: toFiniteNumber(snapshot.top, image.top || 0),
      scaleX: toFiniteNumber(snapshot.scaleX, image.scaleX || 1),
      scaleY: toFiniteNumber(snapshot.scaleY, image.scaleY || 1),
      angle: toFiniteNumber(snapshot.angle, image.angle || 0),
      flipX: !!snapshot.flipX,
      flipY: !!snapshot.flipY,
      skewX: toFiniteNumber(snapshot.skewX, image.skewX || 0),
      skewY: toFiniteNumber(snapshot.skewY, image.skewY || 0),
      originX: snapshot.originX || image.originX || 'left',
      originY: snapshot.originY || image.originY || 'top',
    });
    if (typeof snapshot.opacity === 'number') {
      image.set({ opacity: snapshot.opacity });
    }
    return true;
  } catch (err) {
    CM.error('applyImagePlacementSnapshot: set failed', err);
    return false;
  }
}

// =============================
// CanvasManager
// =============================
const CanvasManager = {
  setDebug(flag) { DEBUG = !!flag; CM.log('DEBUG =>', DEBUG); },

  init(templateData, containerId) {
    CM.log('init: start', { containerId, templateData });
    template = { ...templateData };
    _containerId = containerId;

    // sécuriser numériques si présents
    for (const k of ['print_area_left','print_area_top','print_area_width','print_area_height']) {
      if (template[k] != null) template[k] = parseFloat(template[k]);
    }

    const container = document.getElementById(containerId);
    if (!container) { CM.error('❌ Conteneur introuvable :', containerId); return; }

    // (ré)initialise readiness
    bgReady = new Promise(r => (_bgReadyResolve = r));
    maskReady = new Promise(r => (_maskReadyResolve = r));

    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = new ResizeObserver(() => this._resizeToContainer(containerId));
    resizeObserver.observe(container);
    CM.log('init: resizeObserver attach');

    // reset wrapper
    const old = container.querySelector('#productCanvasWrapper');
    if (old) { old.remove(); CM.log('init: ancien wrapper supprimé'); }

    // wrapper + canvas
    const wrapper = document.createElement('div');
    wrapper.id = 'productCanvasWrapper';
    const canvasEl = document.createElement('canvas');
    canvasEl.id = 'productCanvas';
    wrapper.appendChild(canvasEl);
    container.appendChild(wrapper);

    canvas = new fabric.Canvas(canvasEl, { preserveObjectStacking: true, selection: true });
    CM.log('init: fabric.Canvas créé');

    // Charger BG à taille native
    CM.log('init: chargement BG', template.image_url);
    fabric.Image.fromURL(template.image_url, (img) => {
      img.set({ left: 0, top: 0, originX: 'left', originY: 'top', selectable: false, evented: false });
      bgImage = img;

      canvas.setWidth(img.width);
      canvas.setHeight(img.height);
      canvas.add(bgImage);
      canvas.sendToBack(bgImage);
      _bgReadyResolve?.();
      CM.log('init: BG chargé', { width: img.width, height: img.height });

      // Charger clipPath (image_path) 1:1 avec BG
      if (template.image_path) {
        CM.log('init: chargement mask image_path', template.image_path);
        fabric.Image.fromURL(template.image_path, (clipImg) => {
          const sX = (bgImage.width  || clipImg.width)  / clipImg.width;
          const sY = (bgImage.height || clipImg.height) / clipImg.height;
          clipImg.set({
            left: 0, top: 0,
            originX: 'left', originY: 'top',
            scaleX: sX, scaleY: sY,
            absolutePositioned: true,
            objectCaching: false,
            selectable: false, evented: false,
            strokeWidth: 0, opacity: 1,
          });
          maskPath = clipImg;
          _maskReadyResolve?.();
          CM.log('init: mask chargé', { maskW: clipImg.width, maskH: clipImg.height, sX, sY });

          // Première mise à l’échelle uniquement quand le conteneur est visible
          waitForContainerSize(containerId, () => {
            this._resizeToContainer(containerId);
            canvas.requestRenderAll();
            notifyChange('init(mask loaded)');
          });
        }, { crossOrigin: 'anonymous' });
      } else {
        _maskReadyResolve?.(); // pas de masque
        waitForContainerSize(containerId, () => {
          this._resizeToContainer(containerId);
          canvas.requestRenderAll();
          notifyChange('init(no mask)');
        });
      }
    }, { crossOrigin: 'anonymous' });

    // Recalcule si la fenêtre change
    window.addEventListener('resize', () => this._resizeToContainer(containerId));

    // Listeners : sync + notif + sélection
    const logEvent = (name) => () => {
      CM.log('Fabric event:', name, {
        objects: canvas.getObjects().length,
        activeType: canvas.getActiveObject()?.type || null,
      });
      this.syncTo3D && this.syncTo3D();
      notifyChange(name);
    };
    canvas.on('object:modified',   logEvent('object:modified'));
    canvas.on('object:added',      logEvent('object:added'));
    canvas.on('object:removed',    logEvent('object:removed'));
    canvas.on('selection:created', logEvent('selection:created'));
    canvas.on('selection:updated', logEvent('selection:updated'));
    canvas.on('selection:cleared', logEvent('selection:cleared'));

    // notifier l'UI au démarrage
    notifyChange('init(end)');
  },

  // ===== BBOX de fenêtre imprimable =====
  getClipWindowBBox() {
    // 1) Si la print_area du template est renseignée, on s’aligne dessus
    if (template?.print_area_width != null && template?.print_area_height != null) {
      const b = {
        left:  Number(template.print_area_left  ?? 0),
        top:   Number(template.print_area_top   ?? 0),
        width: Number(template.print_area_width),
        height:Number(template.print_area_height),
      };
      CM.log("getClipWindowBBox(CanvasManager): from template print_area", b);
      return b;
    }
    // 2) Sinon, bbox du mask
    if (maskPath) {
      const m = maskPath.getBoundingRect(true);
      const b = { left: m.left, top: m.top, width: m.width, height: m.height };
      CM.log("getClipWindowBBox(CanvasManager): from mask bbox", b);
      return b;
    }
    // 3) Fallback canvas entier
    const b = { left: 0, top: 0, width: canvas?.width || 0, height: canvas?.height || 0 };
    CM.log("getClipWindowBBox(CanvasManager): fallback full canvas", b);
    return b;
  },

  // Ajoute l’image utilisateur sous le clip (origine = coin HG de la fenêtre)
  addImage(url, optionsOrCallback, maybeCallback) {
    if (!canvas) { CM.warn('addImage: canvas absent'); return; }
    CM.log('addImage: start', url);

    let options = {};
    let done = null;
    if (typeof optionsOrCallback === 'function') {
      done = optionsOrCallback;
    } else if (optionsOrCallback && typeof optionsOrCallback === 'object') {
      options = optionsOrCallback;
      if (typeof maybeCallback === 'function') {
        done = maybeCallback;
      }
    } else if (typeof maybeCallback === 'function') {
      done = maybeCallback;
    }

    const placement = options?.placement || null;

    const applySavedPlacement = (img, zone) => {
      if (!placement || !img) return;
      const safeNumber = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
      };

      const width = safeNumber(placement.design_width);
      const height = safeNumber(placement.design_height);
      if (width != null && img.width) {
        const scaleX = width / img.width;
        if (Number.isFinite(scaleX) && scaleX > 0) {
          img.set({ scaleX });
        }
      }
      if (height != null && img.height) {
        const scaleY = height / img.height;
        if (Number.isFinite(scaleY) && scaleY > 0) {
          img.set({ scaleY });
        }
      }

      const left = safeNumber(placement.design_left);
      const top = safeNumber(placement.design_top);
      if (left != null) {
        img.set({ left: zone.left + left });
      }
      if (top != null) {
        img.set({ top: zone.top + top });
      }

      if (placement.design_angle != null) {
        const angle = safeNumber(placement.design_angle);
        if (angle != null) {
          img.set({ angle });
        }
      }
      if (typeof placement.design_flipX !== 'undefined') {
        img.set({ flipX: !!placement.design_flipX });
      }
    };

    Promise.all([bgReady, maskReady]).then(() => {
      CM.log('addImage: BG+mask ready');
      fabric.Image.fromURL(url, (img) => {
        CM.log('addImage: image chargée', { iw: img.width, ih: img.height });
        const zone = CanvasManager.getClipWindowBBox();
        const iw = img.width, ih = img.height;
        const zw = zone.width, zh = zone.height;
        const ratioW = Number.isFinite(zw / iw) ? zw / iw : 1;
        const ratioH = Number.isFinite(zh / ih) ? zh / ih : 1;
        const scale = Math.max(Math.min(ratioW, ratioH), 0) || 1; // contain, shrink if needed
        const scaledWidth = iw * scale;
        const scaledHeight = ih * scale;
        const left = zone.left + (zw - scaledWidth) / 2;
        const top = zone.top + (zh - scaledHeight) / 2;

        img.set({
          left,
          top,
          originX: 'left',
          originY: 'top',
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          hasControls: true,
          lockUniScaling: true,
        });

        applySavedPlacement(img, zone);

        const finalize = () => {
          canvas.add(img);
          img.setCoords();
          canvas.setActiveObject(img); // sélection auto
          if (bgImage) canvas.sendToBack(bgImage);
          canvas.requestRenderAll();
          rememberInitialPlacement(img);
          CM.log('addImage: finalize -> objets =', canvas.getObjects().length);

          // Double salve de resize anti-lag (si layout bouge après affichage)
          setTimeout(() => this._resizeToContainer(_containerId), 0);
          setTimeout(() => this._resizeToContainer(_containerId), 200);

          setTimeout(() => notifyChange('addImage(finalize)'), 0);

          if (typeof done === 'function') {
            try {
              done(img);
            } catch (err) {
              CM.error('addImage: callback error', err);
            }
          }
        };

        if (maskPath) {
          maskPath.clone((cp) => {
            if (cp) {
              cp.set({
                absolutePositioned: true,
                objectCaching: false,
                selectable: false,
                evented: false,
                originX: 'left',
                originY: 'top',
              });
              img.clipPath = cp;
              CM.log('addImage: clipPath appliqué');
            } else {
              CM.warn('addImage: clipPath clone manquant');
            }
            finalize();
          });
        } else {
          CM.warn('addImage: pas de maskPath (aucun clip)');
          finalize();
        }
      }, { crossOrigin: 'anonymous' });
    }).catch(err => CM.error('addImage: Promise BG/mask KO', err));
  },

  // Nettoyage des images utilisateur (garde BG)
  clearUserImages() {
    if (!canvas) return;
    const imgs = canvas.getObjects().filter(o => o.type === "image" && o !== bgImage);
    imgs.forEach(o => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    CM.log('clearUserImages: removed', imgs.length);
    notifyChange('clearUserImages');
  },

  exportState() {
    if (!canvas) return [];
    const all = canvas.getObjects() || [];
    const layers = all.filter(o => o && o.type === 'image' && o !== bgImage);
    const getSrc = (obj) => {
      if (!obj) return null;
      try {
        if (typeof obj.getSrc === 'function') {
          const src = obj.getSrc();
          if (src) return src;
        }
      } catch (e) {
        CM.warn('exportState: getSrc error', e);
      }
      return obj?._originalElement?.currentSrc
        || obj?._originalElement?.src
        || obj?._element?.currentSrc
        || obj?._element?.src
        || obj?.src
        || null;
    };

    return layers.map((obj, idx) => {
      const toNumber = (value, fallback) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
      };

      const entry = {
        src: getSrc(obj),
        left: toNumber(obj?.left, 0),
        top: toNumber(obj?.top, 0),
        scaleX: toNumber(obj?.scaleX, 1),
        scaleY: toNumber(obj?.scaleY, 1),
        angle: toNumber(obj?.angle, 0),
        flipX: !!obj?.flipX,
        flipY: !!obj?.flipY,
        originX: obj?.originX || 'left',
        originY: obj?.originY || 'top',
        skewX: toNumber(obj?.skewX, 0),
        skewY: toNumber(obj?.skewY, 0),
        zIndex: idx,
      };

      const opacity = toNumber(obj?.opacity, null);
      if (opacity !== null) {
        entry.opacity = opacity;
      }

      return entry;
    });
  },

  restoreLayerFromState(layer, { onLayerError } = {}) {
    if (!canvas || !layer || !layer.src) {
      if (typeof onLayerError === 'function') {
        onLayerError(layer || null, new Error('restoreLayerFromState: missing data'));
      }
      return Promise.resolve(null);
    }

    const parseNumber = (value, fallback) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    };

    return new Promise((resolve) => {
      fabric.Image.fromURL(layer.src, (img) => {
        if (!img) {
          if (typeof onLayerError === 'function') {
            onLayerError(layer, new Error('restoreLayerFromState: image load failed'));
          }
          resolve(null);
          return;
        }

        try {
          img.set({
            left: parseNumber(layer.left, 0),
            top: parseNumber(layer.top, 0),
            scaleX: parseNumber(layer.scaleX, 1),
            scaleY: parseNumber(layer.scaleY, 1),
            angle: parseNumber(layer.angle, 0),
            flipX: !!layer.flipX,
            flipY: !!layer.flipY,
            originX: layer.originX || 'left',
            originY: layer.originY || 'top',
            skewX: parseNumber(layer.skewX, 0),
            skewY: parseNumber(layer.skewY, 0),
            selectable: true,
            hasControls: true,
            lockUniScaling: true,
          });

          const opacity = parseNumber(layer.opacity, null);
          if (opacity !== null) {
            img.set({ opacity });
          }
        } catch (err) {
          CM.error('restoreLayerFromState: set properties failed', err);
        }

        const finalize = () => {
          try {
            canvas.add(img);
            if (bgImage) {
              canvas.sendToBack(bgImage);
            }
            if (typeof layer.zIndex === 'number') {
              const baseIndex = bgImage ? 1 : 0;
              const targetIndex = Math.max(baseIndex, Math.min(baseIndex + layer.zIndex, canvas.getObjects().length - 1));
              canvas.moveTo(img, targetIndex);
            }
            img.setCoords();
            rememberInitialPlacement(img);
            resolve(img);
          } catch (err) {
            CM.error('restoreLayerFromState: finalize failed', err);
            if (typeof onLayerError === 'function') {
              onLayerError(layer, err);
            }
            resolve(null);
          }
        };

        if (maskPath) {
          maskPath.clone((cp) => {
            if (cp) {
              cp.set({
                absolutePositioned: true,
                objectCaching: false,
                selectable: false,
                evented: false,
                originX: 'left',
                originY: 'top',
              });
              img.clipPath = cp;
            }
            finalize();
          });
        } else {
          finalize();
        }
      }, { crossOrigin: 'anonymous' });
    });
  },

  async restoreState(state, { onLayerError } = {}) {
    if (!Array.isArray(state) || !state.length) {
      return { restored: 0, failed: Array.isArray(state) ? state.length : 0 };
    }

    try {
      await Promise.all([bgReady, maskReady]);
    } catch (err) {
      CM.warn('restoreState: readiness wait failed', err);
    }

    const ordered = state
      .filter(layer => layer && layer.src)
      .slice()
      .sort((a, b) => {
        const za = Number(a?.zIndex);
        const zb = Number(b?.zIndex);
        if (Number.isFinite(za) && Number.isFinite(zb)) return za - zb;
        if (Number.isFinite(za)) return -1;
        if (Number.isFinite(zb)) return 1;
        return 0;
      });

    let restored = 0;
    let failed = 0;
    let lastImage = null;

    for (const layer of ordered) {
      const img = await this.restoreLayerFromState(layer, { onLayerError });
      if (img) {
        restored += 1;
        lastImage = img;
      } else {
        failed += 1;
      }
    }

    if (restored > 0) {
      if (lastImage) {
        canvas.setActiveObject(lastImage);
      }
      canvas.requestRenderAll();
      notifyChange('restoreState');
    }

    if (failed > 0 && typeof onLayerError === 'function') {
      // Already reported per-layer, keep count consistent
    }

    return { restored, failed };
  },

  // Export PNG : crope la fenêtre (print_area si dispo)
  // Par défaut, l'image de fond est masquée pour ne garder que la personnalisation
  exportPNG(includeBackground = false) {
    if (!canvas) { CM.warn('exportPNG: pas de canvas'); return null; }
    const b = this.getClipWindowBBox();
    CM.log('exportPNG: bbox', b);

    const prevVPT = canvas.viewportTransform?.slice();
    canvas.setViewportTransform([1,0,0,1,0,0]);

    const prevBgVisible = bgImage?.visible;
    if (!includeBackground && bgImage) bgImage.visible = false;

    const dataUrl = canvas.toDataURL({
      left: b.left, top: b.top, width: b.width, height: b.height,
      format: 'png',
      multiplier: 1,
      enableRetinaScaling: false,
      withoutShadow: true,
      withoutTransform: true,
    });

    if (!includeBackground && bgImage) bgImage.visible = prevBgVisible;
    if (prevVPT) canvas.setViewportTransform(prevVPT);
    canvas.requestRenderAll();
    CM.log('exportPNG: ok (length)', dataUrl?.length || 0);
    return dataUrl;
  },

  // Sync 3D ultra simple (si une fonction globale est fournie)
  syncTo3D() {
    const dataUrl = this.exportPNG();
    if (!dataUrl) {
      CM.warn('syncTo3D: pas de dataUrl, clear3DTexture si dispo');
      window.clear3DTexture && window.clear3DTexture();
      return;
    }
    const off = document.createElement('canvas');
    const b = this.getClipWindowBBox();
    off.width = b.width; off.height = b.height;
    const ctx = off.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      CM.log('syncTo3D: update3DTextureFromCanvas(off)');
      window.update3DTextureFromCanvas && window.update3DTextureFromCanvas(off);
    };
    img.crossOrigin = 'anonymous';
    img.src = dataUrl;
  },

  // -------- Affichage / Resize --------
  _resizeToContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !canvas || !bgImage) { CM.warn('_resizeToContainer: prérequis manquants'); return; }

    const cw = container.clientWidth || 1;
    const ch = container.clientHeight || 1;
    const zoom = Math.min(cw / bgImage.width, ch / bgImage.height);

    canvas.setZoom(zoom);
    canvas.setWidth(bgImage.width * zoom);
    canvas.setHeight(bgImage.height * zoom);

    const wrapper = document.getElementById('productCanvasWrapper');
    if (wrapper) {
      wrapper.style.width = `${bgImage.width * zoom}px`;
      wrapper.style.height = `${bgImage.height * zoom}px`;
      wrapper.style.margin = '0 auto';
      wrapper.style.display = 'flex';
      wrapper.style.justifyContent = 'center';
      wrapper.style.alignItems = 'center';
    }
    canvas.requestRenderAll();
    CM.log('_resizeToContainer:', { cw, ch, bgW: bgImage.width, bgH: bgImage.height, zoom });
  },

  // Alias public attendu par l'UI
  resizeToContainer(id) {
    CM.log('resizeToContainer: called', id || _containerId);
    this._resizeToContainer(id || _containerId);
  },

  // -------- API UI : état et actions --------
  hasImage() {
    const v = canvas?.getObjects()?.some(o => o.type === 'image' && o !== bgImage) || false;
    CM.log('hasImage =>', v);
    return v;
  },

  hasActiveImage() {
    const a = canvas?.getActiveObject();
    return !!(a && a.type === 'image' && a !== bgImage);
  },

  getActiveUserImage() {
    const a = canvas?.getActiveObject();
    if (a && a.type === 'image' && a !== bgImage) return a;
    const imgs = canvas?.getObjects()?.filter(o => o.type === 'image' && o !== bgImage) || [];
    return imgs[0] || null;
  },

  removeImage() {
    const imgs = canvas?.getObjects()?.filter(o => o.type === 'image' && o !== bgImage) || [];
    if (!imgs.length) { CM.log('removeImage: aucune image'); return; }
    const active = canvas.getActiveObject();
    const target = (active && active.type === 'image' && active !== bgImage) ? active : imgs[0];
    canvas.remove(target);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    CM.log('removeImage: supprimé');
    notifyChange('removeImage');
  },

  resetActiveImage() {
    const img = this.getActiveUserImage();
    if (!img) {
      CM.warn("resetActiveImage: pas d'image active");
      return;
    }

    const snapshot = img[INITIAL_PLACEMENT_KEY];
    if (!snapshot) {
      CM.warn('resetActiveImage: état initial introuvable');
      return;
    }

    const copy = { ...snapshot };
    const applied = applyImagePlacementSnapshot(img, copy);
    if (!applied) {
      CM.warn("resetActiveImage: application de l'état initial échouée");
      return;
    }

    img.setCoords();
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
    emitObjectModified(img, 'reset');
    rememberInitialPlacement(img);
    CM.log('resetActiveImage: restauré');
    notifyChange('resetActiveImage');
  },

  getCurrentImageData() {
    const img = (typeof this.getActiveUserImage === 'function')
      ? this.getActiveUserImage()
      : (canvas?.getActiveObject ? canvas.getActiveObject() : null);
    if (!img || img.type !== 'image' || img === bgImage) { CM.log("getCurrentImageData: pas d'image utilisateur"); return null; }
    const d = {
      left: img.left,
      top: img.top,
      width: img.width * img.scaleX,
      height: img.height * img.scaleY,
      angle: img.angle || 0,
      flipX: !!img.flipX,
    };
    CM.log('getCurrentImageData:', d);
    return d;
  },

  alignImage(position) {
    const img = canvas?.getActiveObject();
    if (!img) { CM.warn("alignImage: pas d'image active"); return; }

    const zone = this.getClipWindowBBox();
    const bounds = img.getBoundingRect(true);
    const offsetX = img.left - bounds.left;
    const offsetY = img.top  - bounds.top;

    if (position === 'left')        img.set({ left: zone.left + offsetX });
    else if (position === 'right')  img.set({ left: zone.left + zone.width - bounds.width + offsetX });
    else if (position === 'center') img.set({ left: zone.left + (zone.width - bounds.width)/2 + offsetX });
    else if (position === 'top')    img.set({ top:  zone.top + offsetY });
    else if (position === 'bottom') img.set({ top:  zone.top + zone.height - bounds.height + offsetY });
    else if (position === 'middle') img.set({ top:  zone.top + (zone.height - bounds.height)/2 + offsetY });
    else CM.warn('alignImage: position inconnue', position);

    img.setCoords();
    canvas.requestRenderAll();
    emitObjectModified(img, `align:${position}`);
    CM.log('alignImage:', position);
    notifyChange('alignImage');
  },

  // Wrappers d'alignement pratiques pour l’UI
  alignLeft()   { return this.alignImage('left'); },
  alignCenter() { return this.alignImage('center'); },
  alignRight()  { return this.alignImage('right'); },
  alignTop()    { return this.alignImage('top'); },
  alignMiddle() { return this.alignImage('middle'); },
  alignBottom() { return this.alignImage('bottom'); },

  rotateImage(angle) {
    const img = canvas?.getActiveObject();
    if (!img) { CM.warn("rotateImage: pas d'image active"); return; }
    img.rotate((img.angle || 0) + angle);
    img.setCoords();
    canvas.requestRenderAll();
    emitObjectModified(img, `rotate:${angle}`);
    CM.log('rotateImage:', angle);
    notifyChange('rotateImage');
  },

  rotateLeft() {
    const img = this.getActiveUserImage();
    if (!img) { CM.warn("rotateLeft: pas d'image active"); return; }
    const current = img.angle || 0;
    const target  = Math.round((current - 90) / 90) * 90;
    img.rotate(target);
    img.setCoords();
    canvas.requestRenderAll();
    emitObjectModified(img, 'rotateLeft');
    notifyChange('rotateLeft');
  },

  rotateRight() {
    const img = this.getActiveUserImage();
    if (!img) { CM.warn("rotateRight: pas d'image active"); return; }
    const current = img.angle || 0;
    const target  = Math.round((current + 90) / 90) * 90;
    img.rotate(target);
    img.setCoords();
    canvas.requestRenderAll();
    emitObjectModified(img, 'rotateRight');
    notifyChange('rotateRight');
  },

  mirrorImage() {
    const img = canvas?.getActiveObject();
    if (!img) { CM.warn("mirrorImage: pas d'image active"); return; }
    img.flipX = !img.flipX;
    img.setCoords();
    canvas.requestRenderAll();
    emitObjectModified(img, 'mirror');
    CM.log('mirrorImage: flipX =', img.flipX);
    notifyChange('mirrorImage');
  },

  bringImageForward() {
    const obj = canvas?.getActiveObject();
    if (!obj) { CM.warn("bringImageForward: pas d'objet actif"); return; }
    canvas.bringForward(obj);
    canvas.requestRenderAll();
    emitObjectModified(obj, 'bringForward');
    CM.log('bringImageForward');
    notifyChange('bringImageForward');
  },

  sendImageBackward() {
    const obj = canvas?.getActiveObject();
    if (!obj) { CM.warn("sendImageBackward: pas d'objet actif"); return; }
    canvas.sendBackwards(obj);
    canvas.requestRenderAll();
    emitObjectModified(obj, 'sendBackward');
    CM.log('sendImageBackward');
    notifyChange('sendImageBackward');
  },

  bringToFront() {
    const img = this.getActiveUserImage();
    if (!img) return;
    canvas.bringToFront(img);
    canvas.requestRenderAll();
    emitObjectModified(img, 'bringToFront');
    notifyChange('bringToFront');
  },

  sendToBack() {
    const img = this.getActiveUserImage();
    if (!img) return;
    canvas.sendToBack(img);
    if (bgImage) canvas.bringToFront(bgImage); // assure le BG reste au fond
    canvas.requestRenderAll();
    emitObjectModified(img, 'sendToBack');
    notifyChange('sendToBack');
  },

  // Export alias attendu
  exportPrintAreaPNG() { return this.exportPNG(false); },

  // Export compatible Printful: image recadrée à la fenêtre + placement (x,y,w,h) dans la fenêtre
  getExportDataForPrintful() {
    if (!canvas) { CM.warn('getExportDataForPrintful: pas de canvas'); return null; }
    const imageObject = this.getActiveUserImage();
    if (!imageObject || !imageObject._element) {
      CM.warn('getExportDataForPrintful: aucune image utilisateur');
      return null;
    }

    const b = this.getClipWindowBBox();
    const imgEl = imageObject._element;
    const scaleX = imageObject.scaleX || 1;
    const scaleY = imageObject.scaleY || 1;

    const baseW = imageObject.width  || imgEl.naturalWidth  || imgEl.width;
    const baseH = imageObject.height || imgEl.naturalHeight || imgEl.height;

    const imgDisplayW = baseW * scaleX;
    const imgDisplayH = baseH * scaleY;

    // Décalage de l’image par rapport à la fenêtre (print area)
    const offsetX = (imageObject.left || 0) - b.left;
    const offsetY = (imageObject.top  || 0) - b.top;

    const cropX = Math.max(0, -offsetX);
    const cropY = Math.max(0, -offsetY);

    const visibleW = Math.min(imgDisplayW - cropX, b.width  - Math.max(0, offsetX));
    const visibleH = Math.min(imgDisplayH - cropY, b.height - Math.max(0, offsetY));

    if (visibleW <= 0 || visibleH <= 0) {
      CM.warn('getExportDataForPrintful: image totalement hors zone');
      return null;
    }

    // Canvas de sortie à la taille EXACTE de la portion visible
    const out = document.createElement('canvas');
    out.width = Math.round(visibleW);
    out.height = Math.round(visibleH);
    const ctx = out.getContext('2d');
    ctx.clearRect(0,0,out.width,out.height);

    // Source crop dans l'image originale (pré-scale)
    const srcX = cropX / scaleX;
    const srcY = cropY / scaleY;
    const srcW = visibleW / scaleX;
    const srcH = visibleH / scaleY;

    ctx.drawImage(imgEl, srcX, srcY, srcW, srcH, 0, 0, out.width, out.height);

    return {
      imageDataUrl: out.toDataURL('image/png'),
      placement: {
        x: Math.max(0, Math.round(offsetX)),
        y: Math.max(0, Math.round(offsetY)),
        width:  Math.round(visibleW),
        height: Math.round(visibleH),
      }
    };
  },

  // Restauration depuis des données produit (positions relatives à la print area)
  restoreFromProductData(data, callback) {
    if (!data || !data.design_image_url) { CM.warn('restoreFromProductData: données manquantes'); return; }

    Promise.all([bgReady, maskReady]).then(() => {
      fabric.Image.fromURL(data.design_image_url, (img) => {
        const b = this.getClipWindowBBox();
        const sX = (data.design_width  || img.width)  / img.width;
        const sY = (data.design_height || img.height) / img.height;

        img.set({
          left: b.left + (data.design_left || 0),
          top:  b.top  + (data.design_top  || 0),
          originX: 'left', originY: 'top',
          scaleX: sX, scaleY: sY,
          selectable: true, hasControls: true, lockUniScaling: true,
          angle: data.design_angle || 0,
          flipX: !!data.design_flipX,
        });

        const finalize = () => {
          canvas.add(img);
          img.setCoords();
          canvas.setActiveObject(img);
          if (bgImage) canvas.sendToBack(bgImage);
          canvas.requestRenderAll();
          rememberInitialPlacement(img);
          notifyChange('restoreFromProductData');
          if (typeof callback === 'function') callback();
        };

        if (maskPath) {
          maskPath.clone((cp) => {
            if (cp) {
              cp.set({
                absolutePositioned: true,
                objectCaching: false,
                selectable: false,
                evented: false,
                originX: 'left',
                originY: 'top',
              });
              img.clipPath = cp;
            }
            finalize();
          });
        } else {
          finalize();
        }
      }, { crossOrigin: 'anonymous' });
    });
  },

  // Données à sauvegarder côté produit (relatives à la print area)
  getProductDataForSave() {
    const img = this.getActiveUserImage();
    if (!img || !img._element) return null;
    const b = this.getClipWindowBBox();

    return {
      design_image_url: img._element.currentSrc || img._element.src || null,
      design_left:   Math.round((img.left || 0) - b.left),
      design_top:    Math.round((img.top  || 0) - b.top),
      design_width:  Math.round((img.width  || img._element.naturalWidth)  * (img.scaleX || 1)),
      design_height: Math.round((img.height || img._element.naturalHeight) * (img.scaleY || 1)),
      design_angle:  Math.round(img.angle || 0),
      design_flipX:  !!img.flipX,
    };
  },

  // Debug
  getState() {
    const state = {
      hasImage: this.hasImage(),
      activeType: canvas?.getActiveObject()?.type || null,
      objects: canvas?.getObjects()?.map(o => ({ type: o.type, isBG: o === bgImage })) || [],
      template,
      bgDims: { w: bgImage?.width || 0, h: bgImage?.height || 0 },
      printArea: this.getClipWindowBBox(),
    };
    CM.log('getState =>', state);
    return state;
  },

  forceNotify() { notifyChange('forceNotify'); },
};

window.CanvasManager = CanvasManager;

// (Optionnel) SHIM rétro-compat si d’anciens appels libres traînent encore
if (typeof window.getClipWindowBBox !== 'function') {
  window.getClipWindowBBox = function () {
    return window.CanvasManager && typeof window.CanvasManager.getClipWindowBBox === 'function'
      ? window.CanvasManager.getClipWindowBBox()
      : { left: 0, top: 0, width: 0, height: 0 };
  };
}
