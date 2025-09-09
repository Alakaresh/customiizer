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
  log: (...a)   => { if (DEBUG) console.log("[CanvasManager]", ...a); },
  warn: (...a)  => { if (DEBUG) console.warn("[CanvasManager]", ...a); },
  error: (...a) => console.error("[CanvasManager]", ...a),
};

// =============================
// Helpers
// =============================

// 1) Attendre que le conteneur soit VISIBLE (dimensions > 0) avant de calculer le zoom
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

// 2) Fallback DOM (scopé au modal) — cache/affiche bouton + outils + classe CSS
function toggleUI(hasImage) {
  const root = document.getElementById('customizeModal') || document;
  const addBtn  = root.querySelector('#addImageButton');
  const header  = root.querySelector('.visual-header');
  const tools   = root.querySelector('.image-controls');

  // Classe globale pour le CSS (montre header / cache le bouton)
  if (root.id === 'customizeModal') {
    root.classList.toggle('has-user-image', !!hasImage);
  }

  if (addBtn) {
    addBtn.toggleAttribute('hidden', hasImage);
    addBtn.setAttribute('aria-hidden', hasImage ? 'true' : 'false');
    addBtn.style.setProperty('display', hasImage ? 'none' : '', 'important');
  }
  if (header) {
    header.style.setProperty('display', hasImage ? 'flex' : 'none', 'important');
    header.style.setProperty('visibility', hasImage ? 'visible' : 'hidden', 'important');
    header.style.setProperty('opacity', hasImage ? '1' : '0', 'important');
    header.style.setProperty('pointer-events', hasImage ? 'auto' : 'none', 'important');
  }
  if (tools) {
    tools.style.setProperty('display', hasImage ? 'flex' : 'none', 'important');
    tools.style.setProperty('visibility', hasImage ? 'visible' : 'hidden', 'important');
    tools.style.setProperty('opacity', hasImage ? '1' : '0', 'important');
    tools.style.setProperty('pointer-events', hasImage ? 'auto' : 'none', 'important');
  }
}

// 3) notifyChange : évènements + compat UI + fallback DOM
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

          // ➜ Première mise à l’échelle uniquement quand le conteneur est visible
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

  // Ajoute l’image utilisateur sous le clip (origine = coin HG de la fenêtre)
  addImage(url) {
    if (!canvas) { CM.warn('addImage: canvas absent'); return; }
    CM.log('addImage: start', url);

    Promise.all([bgReady, maskReady]).then(() => {
      CM.log('addImage: BG+mask ready');
      fabric.Image.fromURL(url, (img) => {
        CM.log('addImage: image chargée', { iw: img.width, ih: img.height });
        const zone = getClipWindowBBox();
        const iw = img.width, ih = img.height;
        const zw = zone.width, zh = zone.height;
        const scale = Math.max(zw / iw, zh / ih); // cover

        img.set({
          left: zone.left,
          top:  zone.top,
          originX: 'left',
          originY: 'top',
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          hasControls: true,
          lockUniScaling: true,
        });

        const finalize = () => {
          canvas.add(img);
          img.setCoords();
          canvas.setActiveObject(img); // sélection auto
          if (bgImage) canvas.sendToBack(bgImage);
          canvas.requestRenderAll();
          CM.log('addImage: finalize -> objets =', canvas.getObjects().length);

          // ➜ Double salve de resize anti-lag (si layout bouge après affichage)
          setTimeout(() => this._resizeToContainer(_containerId), 0);
          setTimeout(() => this._resizeToContainer(_containerId), 200);

          setTimeout(() => notifyChange('addImage(finalize)'), 0);
        };

        if (maskPath) {
          cloneClipPath((cp) => {
            if (cp) { img.clipPath = cp; CM.log('addImage: clipPath appliqué'); }
            else { CM.warn('addImage: clipPath manquant'); }
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
    const imgs = getUserImages();
    imgs.forEach(o => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    CM.log('clearUserImages: removed', imgs.length);
    notifyChange('clearUserImages');
  },

  // Export PNG : crope la fenêtre (print_area si dispo)
  exportPNG() {
    if (!canvas) { CM.warn('exportPNG: pas de canvas'); return null; }
    const b = getClipWindowBBox();
    CM.log('exportPNG: bbox', b);

    const prevVPT = canvas.viewportTransform?.slice();
    canvas.setViewportTransform([1,0,0,1,0,0]);

    const dataUrl = canvas.toDataURL({
      left: b.left, top: b.top, width: b.width, height: b.height,
      format: 'png',
      multiplier: 1,
      enableRetinaScaling: false,
      withoutShadow: true,
      withoutTransform: true,
    });

    if (prevVPT) canvas.setViewportTransform(prevVPT);
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
    const b = getClipWindowBBox();
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
    const v = getUserImages().length > 0;
    CM.log('hasImage =>', v);
    return v;
  },

  removeImage() {
    const imgs = getUserImages();
    if (!imgs.length) { CM.log('removeImage: aucune image'); return; }
    const active = canvas.getActiveObject();
    const target = (active && active.type === 'image' && active !== bgImage) ? active : imgs[0];
    canvas.remove(target);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    CM.log('removeImage: supprimé');
    notifyChange('removeImage');
  },

  getCurrentImageData() {
    const img = canvas?.getActiveObject();
    if (!img || img.type !== 'image' || img === bgImage) { CM.log("getCurrentImageData: pas d'image active"); return null; }
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

    const zone = getClipWindowBBox();
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
    CM.log('alignImage:', position);
    notifyChange('alignImage');
  },

  rotateImage(angle) {
    const img = canvas?.getActiveObject();
    if (!img) { CM.warn("rotateImage: pas d'image active"); return; }
    img.rotate((img.angle || 0) + angle);
    img.setCoords();
    canvas.requestRenderAll();
    CM.log('rotateImage:', angle);
    notifyChange('rotateImage');
  },

  mirrorImage() {
    const img = canvas?.getActiveObject();
    if (!img) { CM.warn("mirrorImage: pas d'image active"); return; }
    img.flipX = !img.flipX;
    img.setCoords();
    canvas.requestRenderAll();
    CM.log('mirrorImage: flipX =', img.flipX);
    notifyChange('mirrorImage');
  },

  bringImageForward() {
    const obj = canvas?.getActiveObject();
    if (!obj) { CM.warn("bringImageForward: pas d'objet actif"); return; }
    canvas.bringForward(obj);
    canvas.requestRenderAll();
    CM.log('bringImageForward');
    notifyChange('bringImageForward');
  },

  sendImageBackward() {
    const obj = canvas?.getActiveObject();
    if (!obj) { CM.warn("sendImageBackward: pas d'objet actif"); return; }
    canvas.sendBackwards(obj);
    canvas.requestRenderAll();
    CM.log('sendImageBackward');
    notifyChange('sendImageBackward');
  },

  // Debug
  getState() {
    const state = {
      hasImage: this.hasImage(),
      activeType: canvas?.getActiveObject()?.type || null,
      objects: canvas?.getObjects()?.map(o => ({ type: o.type, isBG: o === bgImage })) || [],
      template,
      bgDims: { w: bgImage?.width || 0, h: bgImage?.height || 0 },
      printArea: getClipWindowBBox(),
    };
    CM.log('getState =>', state);
    return state;
  },

  forceNotify() { notifyChange('forceNotify'); },
};

window.CanvasManager = CanvasManager;
