// 📁 canvasManager.js — version ultra-simplifiée (BG + clipPath image_path)

let canvas = null;
let template = null;
let bgImage = null;      // Image de fond (template)
let maskPath = null;     // Clip path (image_path)
let resizeObserver = null;

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
  // On considère "image utilisateur" = toutes les images sauf le background
  return canvas.getObjects().filter(o => o.type === 'image' && o !== bgImage);
}

const CanvasManager = {
  init(templateData, containerId) {
    template = { ...templateData };

    // sécuriser numériques si présents
    for (const k of ['print_area_left','print_area_top','print_area_width','print_area_height']) {
      if (template[k] != null) template[k] = parseFloat(template[k]);
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error("[CanvasManager] ❌ Conteneur introuvable :", containerId);
      return;
    }

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

    canvas = new fabric.Canvas(canvasEl, { preserveObjectStacking: true, selection: false });

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

          this._resizeToContainer(containerId);
          canvas.requestRenderAll();
        }, { crossOrigin: 'anonymous' });
      } else {
        this._resizeToContainer(containerId);
        canvas.requestRenderAll();
      }
    }, { crossOrigin: 'anonymous' });

    window.addEventListener('resize', () => this._resizeToContainer(containerId));

    // sync 3D basique : à chaque changement on exporte la zone imprimable
    canvas.on('object:modified', () => this.syncTo3D && this.syncTo3D());
    canvas.on('object:added',    () => this.syncTo3D && this.syncTo3D());
    canvas.on('object:removed',  () => this.syncTo3D && this.syncTo3D());
  },

  // Ajoute l’image utilisateur et l’applique sous le clip (origine = coin HG de la print_area si dispo, sinon 0,0)
  addImage(url) {
    if (!canvas || !bgImage) return;

    fabric.Image.fromURL(url, (img) => {
      // zone de placement initiale : print_area si dispo, sinon tout le canvas
      const L = (template.print_area_left  ?? 0);
      const T = (template.print_area_top   ?? 0);
      const W = (template.print_area_width ?? bgImage.width);
      const H = (template.print_area_height?? bgImage.height);

      // “cover” par défaut (remplit la fenêtre ; rognera si nécessaire)
      const iw = img.width, ih = img.height;
      const scale = Math.max(W / iw, H / ih);

      img.set({
        left: L,
        top:  T,
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
        if (bgImage) canvas.sendToBack(bgImage);
        canvas.requestRenderAll();
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
  },

  // Optionnel : supprime les images utilisateur (garde BG/clip)
  clearUserImages() {
    if (!canvas) return;
    canvas.getObjects().forEach(o => {
      if (o.type === 'image' && o !== bgImage) canvas.remove(o);
    });
    canvas.requestRenderAll();
  },

  // Exporte la zone print_area si dispo, sinon tout le canvas (viewport neutre)
  exportPNG() {
    if (!canvas) return null;

    const L = (template.print_area_left  ?? 0);
    const T = (template.print_area_top   ?? 0);
    const W = (template.print_area_width ?? canvas.width);
    const H = (template.print_area_height?? canvas.height);

    const prevVPT = canvas.viewportTransform?.slice();
    canvas.setViewportTransform([1,0,0,1,0,0]);

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

  // Sync 3D ultra simple (si une fonction globale est fournie)
  syncTo3D() {
    const dataUrl = this.exportPNG();
    if (!dataUrl) {
      window.clear3DTexture && window.clear3DTexture();
      return;
    }
    const off = document.createElement('canvas');
    const b = {
      w: (template.print_area_width ?? canvas.width),
      h: (template.print_area_height ?? canvas.height)
    };
    off.width = b.w; off.height = b.h;
    const ctx = off.getContext('2d');
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0); window.update3DTextureFromCanvas && window.update3DTextureFromCanvas(off); };
    img.crossOrigin = 'anonymous';
    img.src = dataUrl;
  },

  // zoom canvas pour remplir le conteneur (sans toucher aux objets)
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
  }
  hasImage() {
  return getUserImages().length > 0;
},

removeImage() {
  const imgs = getUserImages();
  if (!imgs.length) return;
  // supprime l'image active si c'est une image utilisateur, sinon la première
  const active = canvas.getActiveObject();
  const target = (active && active.type === 'image' && active !== bgImage) ? active : imgs[0];
  canvas.remove(target);
  canvas.requestRenderAll();
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

};

window.CanvasManager = CanvasManager;
