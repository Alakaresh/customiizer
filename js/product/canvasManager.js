// 📁 canvasManager.js — BG + clipPath (image_path) + API UI + notifications robustes

let canvas = null;
let template = null;
let bgImage = null;       // Image de fond (template)
let maskPath = null;      // Clip path (image_path), NON ajouté à la scène
let resizeObserver = null;

// Mémo du conteneur pour resize public
let _containerId = null;

// Promesses de readiness (BG + masque) pour éviter les courses
let _bgReadyResolve, _maskReadyResolve;
let bgReady = new Promise(r => _bgReadyResolve = r);
let maskReady = new Promise(r => _maskReadyResolve = r);

// ---------- Helpers ----------
function cloneClipPath(done) {
  if (!maskPath) return done(null);
  maskPath.clone((cp) => {
    cp.set({
      absolutePositioned: true,
      objectCaching: false,
      selectable: false,
      evented: false,
      originX: 'left',
      originY: 'top'
    });
    done(cp);
  });
}

function getUserImages() {
  if (!canvas) return [];
  // "image utilisateur" = toutes les images de la scène sauf le BG (maskPath n'est pas dans la scène)
  return canvas.getObjects().filter(o => o.type === 'image' && o !== bgImage);
}

// Fenêtre imprimable (0,0) = coin HG de la print_area si dispo, sinon bbox du masque, sinon canvas entier
function getClipWindowBBox() {
  if (template?.print_area_width != null && template?.print_area_height != null) {
    return {
      left:  Number(template.print_area_left  ?? 0),
      top:   Number(template.print_area_top   ?? 0),
      width: Number(template.print_area_width),
      height:Number(template.print_area_height)
    };
  }
  if (maskPath) {
    const b = maskPath.getBoundingRect(true);
    return { left: b.left, top: b.top, width: b.width, height: b.height };
  }
  return { left: 0, top: 0, width: canvas?.width || 0, height: canvas?.height || 0 };
}

// Notifie l'UI : CustomEvent + jQuery + compat + fallback DOM
function notifyChange() {
  const hasImage = CanvasManager.hasImage ? CanvasManager.hasImage() : false;
  const activeObj = canvas?.getActiveObject();
  const hasActiveImage = !!(activeObj && activeObj.type === 'image' && activeObj !== bgImage);

  // 1) CustomEvent natif
  try {
    window.dispatchEvent(new CustomEvent('canvas:image-change', {
      detail: { hasImage, hasActiveImage }
    }));
  } catch (_) {}

  // 2) jQuery event si présent (ton projet a jQuery)
  try {
    if (window.jQuery) {
      window.jQuery(document).trigger('canvas:image-change', [{ hasImage, hasActiveImage }]);
    }
  } catch (_) {}

  // 3) Compat direct : fonction globale de ton UI si dispo
  try {
    if (typeof window.updateAddImageButtonVisibility === 'function') {
      window.updateAddImageButtonVisibility();
    }
  } catch (_) {}

  // 4) Fallback DOM (si personne n’écoute)
  const addBtn =
    document.querySelector('#btn-add-image') ||
    document.querySelector('.btn-add-image') ||
    document.querySelector('[data-role="btn-add-image"]') ||
    document.querySelector('button[data-action="add-image"]');

  if (addBtn) addBtn.style.display = hasImage ? 'none' : '';

  const tools =
    document.querySelector('#image-tools') ||
    document.querySelector('.image-tools') ||
    document.querySelector('[data-role="image-tools"]') ||
    document.querySelector('.customizer-tools');

  if (tools) tools.style.display = hasImage ? '' : 'none';
}

// ---------- CanvasManager ----------
const CanvasManager = {
  init(templateData, containerId) {
    template = { ...templateData };
    _containerId = containerId;

    // sécuriser numériques si présents
    for (const k of ['print_area_left','print_area_top','print_area_width','print_area_height']) {
      if (template[k] != null) template[k] = parseFloat(template[k]);
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error("[CanvasManager] ❌ Conteneur introuvable :", containerId);
      return;
    }

    // (ré)initialise readiness
    bgReady = new Promise(r => _bgReadyResolve = r);
    maskReady = new Promise(r => _maskReadyResolve = r);

    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = new ResizeObserver(() => this._resizeToContainer(containerId));
    resizeObserver.observe(container);

    // reset wrapper
    const old = container.querySelector('#productCanvasWrapper');
    if (old) old.remove();

    // wrapper + canvas
    const wrapper = document.createElement('div');
    wrapper.id = 'productCanvasWrapper';
    const canvasEl = document.createElement('canvas');
    canvasEl.id = 'productCanvas';
    wrapper.appendChild(canvasEl);
    container.appendChild(wrapper);

    canvas = new fabric.Canvas(canvasEl, { preserveObjectStacking: true, selection: true });

    // 1) Charger le BG à taille native (PAS de scale sur l’objet)
    fabric.Image.fromURL(template.image_url, (img) => {
      img.set({
        left: 0, top: 0,
        originX: 'left', originY: 'top',
        selectable: false, evented: false
      });
      bgImage = img;

      canvas.setWidth(img.width);
      canvas.setHeight(img.height);
      canvas.add(bgImage);
      canvas.sendToBack(bgImage);
      _bgReadyResolve?.();

      // 2) Charger le clipPath (image_path) et l’aligner 1:1 sur le BG
      if (template.image_path) {
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
            strokeWidth: 0, opacity: 1
          });
          maskPath = clipImg;
          _maskReadyResolve?.();

          this._resizeToContainer(containerId);
          canvas.requestRenderAll();
          notifyChange();
        }, { crossOrigin: 'anonymous' });
      } else {
        _maskReadyResolve?.(); // pas de masque => considéré prêt
        this._resizeToContainer(containerId);
        canvas.requestRenderAll();
        notifyChange();
      }
    }, { crossOrigin: 'anonymous' });

    window.addEventListener('resize', () => this._resizeToContainer(containerId));

    // Listeners : sync + notif + sélection
    const _onAny = () => { this.syncTo3D && this.syncTo3D(); notifyChange(); };
    canvas.on('object:modified', _onAny);
    canvas.on('object:added',    _onAny);
    canvas.on('object:removed',  _onAny);
    canvas.on('selection:created', _onAny);
    canvas.on('selection:updated', _onAny);
    canvas.on('selection:cleared', _onAny);

    // notifier l'UI au démarrage
    notifyChange();
  },

  // Ajoute l’image utilisateur sous le clip (origine = coin HG de la fenêtre)
  addImage(url) {
    if (!canvas) return;

    // On attend BG + masque pour garantir le découpage et le bon placement
    Promise.all([bgReady, maskReady]).then(() => {
      fabric.Image.fromURL(url, (img) => {
        const zone = getClipWindowBBox();
        const iw = img.width, ih = img.height;
        const zw = zone.width, zh = zone.height;

        // cover : remplit la fenêtre (rognage possible)
        const scale = Math.max(zw / iw, zh / ih);

        img.set({
          left: zone.left,
          top:  zone.top,
          originX: 'left',
          originY: 'top',
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          hasControls: true,
          lockUniScaling: true
        });

        const finalize = () => {
          canvas.add(img);
          img.setCoords();
          // Sélection auto => l’UI a un objet actif
          canvas.setActiveObject(img);
          if (bgImage) canvas.sendToBack(bgImage);
          canvas.requestRenderAll();
          // Notif immédiate (au cas où l’UI ne réagit pas aux events Fabric)
          setTimeout(notifyChange, 0);
        };

        if (maskPath) {
          cloneClipPath((cp) => {
            if (cp) img.clipPath = cp;
            finalize();
          });
        } else {
          finalize();
        }
      }, { crossOrigin: 'anonymous' });
    });
  },

  // Nettoyage des images utilisateur (garde BG)
  clearUserImages() {
    if (!canvas) return;
    getUserImages().forEach(o => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    notifyChange();
  },

  // Export PNG : crope la fenêtre (print_area si dispo)
  exportPNG() {
    if (!canvas) return null;

    const b = getClipWindowBBox();

    const prevVPT = canvas.viewportTransform?.slice();
    canvas.setViewportTransform([1,0,0,1,0,0]);

    const dataUrl = canvas.toDataURL({
      left: b.left, top: b.top, width: b.width, height: b.height,
      format: 'png',
      multiplier: 1,
      enableRetinaScaling: false,
      withoutShadow: true,
      withoutTransform: true
    });

    if (prevVPT) canvas.setViewportTransform(prevVPT);
    return dataUrl;
  },

  // Sync 3D ultra simple (si une fonction globale est fournie)
  syncTo3D() {
    const dataUrl = this.exportPNG();
    if (!dataUrl) {
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
      window.update3DTextureFromCanvas && window.update3DTextureFromCanvas(off);
    };
    img.crossOrigin = 'anonymous';
    img.src = dataUrl;
  },

  // -------- Affichage / Resize --------
  _resizeToContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !canvas || !bgImage) return;

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
  },

  // Alias public attendu par l'UI
  resizeToContainer(id) {
    this._resizeToContainer(id || _containerId);
  },

  // -------- API UI : état et actions --------
  hasImage() {
    return getUserImages().length > 0;
  },

  removeImage() {
    const imgs = getUserImages();
    if (!imgs.length) return;
    const active = canvas.getActiveObject();
    const target = (active && active.type === 'image' && active !== bgImage) ? active : imgs[0];
    canvas.remove(target);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    notifyChange();
  },

  getCurrentImageData() {
    const img = canvas?.getActiveObject();
    if (!img || img.type !== 'image' || img === bgImage) return null;
    return {
      left: img.left,
      top: img.top,
      width: img.width * img.scaleX,
      height: img.height * img.scaleY,
      angle: img.angle || 0,
      flipX: !!img.flipX
    };
  },

  // Alignements dans la fenêtre
  alignImage(position) {
    const img = canvas?.getActiveObject();
    if (!img) return;

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

    img.setCoords();
    canvas.requestRenderAll();
    notifyChange();
  },

  rotateImage(angle) {
    const img = canvas?.getActiveObject();
    if (!img) return;
    img.rotate((img.angle || 0) + angle);
    img.setCoords();
    canvas.requestRenderAll();
    notifyChange();
  },

  mirrorImage() {
    const img = canvas?.getActiveObject();
    if (!img) return;
    img.flipX = !img.flipX;
    img.setCoords();
    canvas.requestRenderAll();
    notifyChange();
  },

  bringImageForward() {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    canvas.bringForward(obj);
    canvas.requestRenderAll();
    notifyChange();
  },

  sendImageBackward() {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    canvas.sendBackwards(obj);
    canvas.requestRenderAll();
    notifyChange();
  }
};

window.CanvasManager = CanvasManager;
