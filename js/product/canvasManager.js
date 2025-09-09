// 📁 canvasManager.js (version "BG natif + zoom canvas")

let canvas = null;
let template = null;
let resizeObserver = null;

let bgImage = null;         // Image de template (fond), chargée à taille native (ex: 1000x1000)
let overlayImage = null;    // Optionnel: overlay par-dessus (si besoin plus tard)
let guideRect = null;       // Guide rouge (optionnel)
let maskPath = null;        // Le masque clipPath (image_path ou rect), posé en coords natives
let containerRef = null;

const CanvasManager = {
  // ========= init =========
  init: function (templateData, containerId) {
    template = { ...templateData };
    containerRef = containerId;

    // 🔢 Sécuriser numériques s’ils existent
    for (const k of [
      'print_area_left','print_area_top','print_area_width','print_area_height',
      'template_width','template_height'
    ]) {
      if (template[k] != null) template[k] = parseFloat(template[k]);
    }

    // 🎯 Container
    const container = document.getElementById(containerId);
    if (!container) {
      console.error("[CanvasManager] ❌ Conteneur introuvable :", containerId);
      return;
    }

    // ♻️ Observer resize
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = new ResizeObserver(() => {
      CanvasManager.resizeToContainer(containerId);
    });
    resizeObserver.observe(container);

    // 🧹 Nettoyage wrapper
    const existingWrapper = container.querySelector('#productCanvasWrapper');
    if (existingWrapper) existingWrapper.remove();

    // 🧱 Wrapper + canvas (taille définie après chargement BG)
    const wrapper = document.createElement("div");
    wrapper.className = "fabric-wrapper";
    wrapper.id = "productCanvasWrapper";

    const canvasEl = document.createElement("canvas");
    canvasEl.id = "productCanvas";
    wrapper.appendChild(canvasEl);
    container.appendChild(wrapper);

    // 🖌️ Fabric
    canvas = new fabric.Canvas(canvasEl, {
      preserveObjectStacking: true,
      selection: false
    });

    // ========= Charger le BG à TAILLE NATIVE, SANS SCALE =========
    // Important: pas de scaleX/scaleY ici ; on affichera via zoom du canvas
    fabric.Image.fromURL(template.image_url, (img) => {
      img.set({
        left: 0, top: 0,
        originX: 'left', originY: 'top',
        selectable: false, evented: false
      });
      bgImage = img;

      // Fixer la taille de travail du canvas aux dimensions NATIVES du BG
      canvas.setWidth(img.width);
      canvas.setHeight(img.height);
      canvas.add(bgImage);
      canvas.sendToBack(bgImage);

      // ========= Créer/Charger le masque (coords NATIVES BG) =========
      makeClipPath((cp) => {
        maskPath = cp; // on le garde à portée
        // Guide rouge optionnel pour feedback
        addOrUpdateGuideRect();

        // Zoom canvas pour remplir le conteneur (affichage)
        CanvasManager.resizeToContainer(containerId);

        // Premier rendu
        canvas.renderAll();
        if (typeof CanvasManager.syncTo3D === 'function') {
          CanvasManager.syncTo3D();
        }
      });

    }, { crossOrigin: 'anonymous' });

    // 🔁 Sync 3D à chaque modif utile
    canvas.on('object:modified', CanvasManager.syncTo3D);
    canvas.on('object:added', CanvasManager.syncTo3D);
    canvas.on('object:removed', CanvasManager.syncTo3D);

    window.addEventListener('resize', () => {
      CanvasManager.resizeToContainer(containerId);
    });
  },

  // ========= addImage =========
  addImage: function (url, callback) {
  if (!canvas || !bgImage) return;

  fabric.Image.fromURL(url, (img) => {
    const zone = getMaskBBox(); // bbox en coords NATIVES
    const scale = Math.min(zone.width / img.width, zone.height / img.height);

    img.set({
      left: zone.left,
      top: zone.top,
      originX: 'left',
      originY: 'top',
      scaleX: scale,
      scaleY: scale,
      selectable: true,
      hasControls: true,
      lockRotation: false,
      lockUniScaling: true,
      hasRotatingPoint: true
    });

    img.setControlsVisibility({
      tl: true, tr: true, bl: true, br: true,
      mt: false, mb: false, ml: false, mr: false, mtr: true
    });

    const finalizeAdd = () => {
      canvas.add(img);
      img.setCoords();
      if (bgImage) canvas.sendToBack(bgImage);
      if (guideRect) canvas.bringToFront(guideRect);

      // marquer sale pour forcer un repaint propre
      img.dirty = true;
      if (img.clipPath) img.clipPath.dirty = true;

      canvas.requestRenderAll();
      if (typeof callback === 'function') callback();
      CanvasManager.syncTo3D?.();
    };

    // ⚠️ CLONE ASYNC du clipPath
    cloneClipPath((cp) => {
      if (cp) img.clipPath = cp;
      finalizeAdd();
    });

  }, { crossOrigin: 'anonymous' });
},


  // ========= restoreFromProductData =========
  // data = { design_image_url, design_left, design_top, design_width, design_height, design_angle, design_flipX }
  // ⚠️ Ici on considère que design_* sont exprimés en coords NATIVES BG.
  restoreFromProductData: function (data, callback) {
  if (!data || !data.design_image_url) return;

  fabric.Image.fromURL(data.design_image_url, (img) => {
    const sX = (data.design_width  && img.width)  ? (data.design_width  / img.width)  : 1;
    const sY = (data.design_height && img.height) ? (data.design_height / img.height) : 1;

    img.set({
      left: (data.design_left  ?? 0),
      top:  (data.design_top   ?? 0),
      scaleX: sX,
      scaleY: sY,
      originX: 'left',
      originY: 'top',
      selectable: true,
      hasControls: true,
      lockRotation: false,
      lockUniScaling: true,
      hasRotatingPoint: true,
      angle: data.design_angle || 0,
      flipX: !!data.design_flipX
    });

    img.setControlsVisibility({
      tl: true, tr: true, bl: true, br: true,
      mt: false, mb: false, ml: false, mr: false, mtr: true
    });

    const finalizeAdd = () => {
      canvas.add(img);
      img.setCoords();
      if (bgImage) canvas.sendToBack(bgImage);
      if (guideRect) canvas.bringToFront(guideRect);

      img.dirty = true;
      if (img.clipPath) img.clipPath.dirty = true;

      canvas.requestRenderAll();
      if (typeof callback === 'function') callback();
      CanvasManager.syncTo3D?.();
    };

    // ⚠️ CLONE ASYNC du clipPath
    cloneClipPath((cp) => {
      if (cp) img.clipPath = cp;
      finalizeAdd();
    });

  }, { crossOrigin: 'anonymous' });
},


  // ========= alignImage =========
  alignImage: function (position) {
    const img = canvas?.getActiveObject();
    if (!img) return;

    const zone = getMaskBBox();
    const bounds = img.getBoundingRect(true);
    const offsetX = img.left - bounds.left;
    const offsetY = img.top  - bounds.top;

    if (position === 'left') {
      img.set({ left: zone.left + offsetX });
    } else if (position === 'right') {
      img.set({ left: zone.left + zone.width - bounds.width + offsetX });
    } else if (position === 'center') {
      img.set({ left: zone.left + (zone.width - bounds.width) / 2 + offsetX });
    } else if (position === 'top') {
      img.set({ top: zone.top + offsetY });
    } else if (position === 'bottom') {
      img.set({ top: zone.top + zone.height - bounds.height + offsetY });
    } else if (position === 'middle') {
      img.set({ top: zone.top + (zone.height - bounds.height) / 2 + offsetY });
    }

    img.setCoords();
    canvas.renderAll();
    CanvasManager.syncTo3D();
  },

  // ========= Z-order =========
  bringImageForward: function () {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    canvas.bringForward(obj);
    if (bgImage) canvas.sendToBack(bgImage);
    if (guideRect) canvas.bringToFront(guideRect);
    canvas.renderAll();
    CanvasManager.syncTo3D();
  },

  sendImageBackward: function () {
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    canvas.sendBackwards(obj);
    if (bgImage) canvas.sendToBack(bgImage);
    if (guideRect) canvas.bringToFront(guideRect);
    canvas.renderAll();
    CanvasManager.syncTo3D();
  },

  // ========= rotations/miroir =========
  rotateImage: function (angle) {
    const img = canvas?.getActiveObject();
    if (!img) return;
    const current = img.angle || 0;
    let target = current + angle;
    target = Math.round(target / 90) * 90;
    img.rotate(target);
    img.setCoords();
    canvas.renderAll();
    CanvasManager.syncTo3D();
  },

  mirrorImage: function () {
    const img = canvas?.getActiveObject();
    if (!img) return;
    img.flipX = !img.flipX;
    img.setCoords();
    canvas.renderAll();
    CanvasManager.syncTo3D();
  },

  // ========= remove/has =========
  removeImage: function () {
    if (!canvas) return;
    // Ne supprime que les images utilisateur (pas le BG)
    const imgs = canvas.getObjects().filter(o => o.type === 'image' && o !== bgImage && o !== overlayImage);
    imgs.forEach(o => canvas.remove(o));
    canvas.renderAll();
    CanvasManager.syncTo3D();
  },

  hasImage: function () {
    if (!canvas) return false;
    return canvas.getObjects().some(o => o.type === 'image' && o !== bgImage && o !== overlayImage);
  },

  // ========= état courant image active (coords NATIVES) =========
  getCurrentImageData: function () {
    if (!canvas) return null;
    const img = canvas.getActiveObject();
    if (!img || img.type !== 'image' || img === bgImage || img === overlayImage) return null;
    return {
      left: img.left,
      top: img.top,
      width: img.width * img.scaleX,
      height: img.height * img.scaleY,
      angle: img.angle || 0,
      flipX: !!img.flipX
    };
  },

  // ========= Export zone masquée (PNG) =========
  exportMaskedAreaPNG: function () {
    if (!canvas) return null;
    const b = getMaskBBox();
    if (!b) return null;

    // Neutraliser le zoom pour exporter pixel-à-pixel
    const prevVPT = canvas.viewportTransform?.slice();
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

    const dataUrl = canvas.toDataURL({
      left: Math.round(b.left),
      top: Math.round(b.top),
      width: Math.round(b.width),
      height: Math.round(b.height),
      format: 'png',
      multiplier: 1,
      enableRetinaScaling: false,
      withoutShadow: true,
      withoutTransform: true
    });

    if (prevVPT) canvas.setViewportTransform(prevVPT);
    return dataUrl;
  },

  // ========= Export "print area" legacy (si besoin, fallback) =========
  exportPrintAreaPNG: function () {
    if (maskPath) return CanvasManager.exportMaskedAreaPNG();
    // Pas de masque : fallback rect basé sur print_area_*
    const L = Math.round(template.print_area_left ?? 0);
    const T = Math.round(template.print_area_top ?? 0);
    const W = Math.round(template.print_area_width ?? canvas.width);
    const H = Math.round(template.print_area_height ?? canvas.height);

    const prevVPT = canvas.viewportTransform?.slice();
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

    const dataUrl = canvas.toDataURL({
      left: L, top: T, width: W, height: H,
      format: 'png',
      multiplier: 1,
      enableRetinaScaling: false,
      withoutShadow: true,
      withoutTransform: true
    });

    if (prevVPT) canvas.setViewportTransform(prevVPT);
    return dataUrl;
  },

  // ========= Export pour Printful (image + placement en bbox masque) =========
  getExportDataForPrintful: function () {
    const dataUrl = CanvasManager.exportMaskedAreaPNG();
    if (!dataUrl) {
      console.warn("[CanvasManager] 🚫 exportMaskedAreaPNG nul");
      return null;
    }
    const b = getMaskBBox();
    return {
      imageDataUrl: dataUrl,
      placement: { x: b.left, y: b.top, width: b.width, height: b.height } // coords NATIVES
    };
  },

  // ========= Sync 3D (envoie un canvas hors-écran à update3DTextureFromCanvas) =========
  syncTo3D: function () {
    const dataUrl = CanvasManager.exportMaskedAreaPNG();
    if (!dataUrl) {
      if (window.clear3DTexture) window.clear3DTexture();
      return;
    }
    const b = getMaskBBox();
    const offscreen = document.createElement('canvas');
    offscreen.width = b.width;
    offscreen.height = b.height;
    const ctx = offscreen.getContext('2d');

    const img = new Image();
    img.onload = function () {
      ctx.clearRect(0, 0, offscreen.width, offscreen.height);
      ctx.drawImage(img, 0, 0);
      if (window.update3DTextureFromCanvas) {
        window.update3DTextureFromCanvas(offscreen);
        if (window.logPrintableMeshPosition) window.logPrintableMeshPosition();
      }
    };
    img.crossOrigin = 'anonymous';
    img.src = dataUrl;
  },

  // ========= Resize to container (affichage via zoom) =========
  resizeToContainer: function (containerId) {
    const container = document.getElementById(containerId);
    if (!container || !canvas || !bgImage) return;

    const containerW = container.clientWidth || 1;
    const containerH = container.clientHeight || 1;

    const sceneW = bgImage.width;
    const sceneH = bgImage.height;
    const zoom = Math.min(containerW / sceneW, containerH / sceneH);

    canvas.setZoom(zoom);
    canvas.setWidth(sceneW * zoom);
    canvas.setHeight(sceneH * zoom);

    // wrapper dimensions réelles
    const wrapper = document.getElementById("productCanvasWrapper");
    if (wrapper) {
      wrapper.style.width = `${sceneW * zoom}px`;
      wrapper.style.height = `${sceneH * zoom}px`;
      wrapper.style.margin = "0 auto";
      wrapper.style.display = "flex";
      wrapper.style.justifyContent = "center";
      wrapper.style.alignItems = "center";
    }
    canvas.renderAll();
  }
};

// ===== Helpers internes =====

// Crée le clipPath : si image_path existe → image native alignée au BG ; sinon rect via print_area_*.
function makeClipPath(done) {
  const L = Math.round(template.print_area_left  ?? 0);
  const T = Math.round(template.print_area_top   ?? 0);
  const W = Math.round(template.print_area_width ?? (bgImage?.width  ?? 0));
  const H = Math.round(template.print_area_height?? (bgImage?.height ?? 0));

if (template.image_path) {
  fabric.Image.fromURL(template.image_path, (clipImg) => {
    // Aligner le masque sur TOUT le template (BG) 1:1
    const sX = (bgImage?.width  || clipImg.width)  / clipImg.width;
    const sY = (bgImage?.height || clipImg.height) / clipImg.height;

    clipImg.set({
      left: 0,
      top:  0,
      originX: 'left',
      originY: 'top',
      scaleX: sX,
      scaleY: sY,
      absolutePositioned: true,
      objectCaching: false,
      selectable: false,
      evented: false,
      strokeWidth: 0,
      opacity: 1
    });

    done(clipImg);
  }, { crossOrigin: 'anonymous' });
  return;
}


  // Pas d’image masque : rect de print_area (ou toute l’image si non défini)
  const rect = new fabric.Rect({
    left: L, top: T, width: W, height: H,
    originX: 'left', originY: 'top',
    absolutePositioned: true,
    objectCaching: false,
    selectable: false, evented: false,
    strokeWidth: 0, fill: 'rgba(0,0,0,0)'
  });
  done(rect);
}
// -- Helper: cloner le clipPath de façon sûre (Fabric v5 = async)
function cloneClipPath(done) {
  if (!maskPath) return done(null);
  maskPath.clone((cp) => {
    cp.set({
      absolutePositioned: true,  // coords canvas (identiques à BG natif)
      objectCaching: false,
      selectable: false,
      evented: false,
      originX: 'left',
      originY: 'top'
    });
    done(cp);
  });
}

function getMaskBBox() {
  if (maskPath) {
    // getBoundingRect(true) renvoie la bbox en coords canvas (ici = coords BG natives)
    const b = maskPath.getBoundingRect(true);
    // Arrondir pour éviter les 0.5px imprécis
    return {
      left: Math.round(b.left),
      top: Math.round(b.top),
      width: Math.round(b.width),
      height: Math.round(b.height)
    };
  }
  // Fallback : print_area_* ou full
  return {
    left: Math.round(template.print_area_left ?? 0),
    top: Math.round(template.print_area_top ?? 0),
    width: Math.round(template.print_area_width ?? (bgImage?.width || 0)),
    height: Math.round(template.print_area_height ?? (bgImage?.height || 0))
  };
}

function addOrUpdateGuideRect() {
  const L = template.print_area_left  ?? 0;
  const T = template.print_area_top   ?? 0;
  const W = template.print_area_width ?? (bgImage?.width  || 0);
  const H = template.print_area_height?? (bgImage?.height || 0);

  if (!guideRect) {
    guideRect = new fabric.Rect({
      left: L, top: T, width: W, height: H,
      fill: 'rgba(0,0,0,0)',
      stroke: 'red',
      strokeWidth: 2,
      strokeUniform: true,
      objectCaching: false,
      selectable: false, evented: false
    });
    canvas.add(guideRect);
  } else {
    guideRect.set({ left: L, top: T, width: W, height: H });
  }
  canvas.bringToFront(guideRect);
  canvas.requestRenderAll();
}


window.CanvasManager = CanvasManager;
