// 📁 threeDManager.js — Zone d’impression en 2 couches (fill + overlay)
// - Détection par nom de mesh contenant "impression"
// - Matériau "fill" = clone du matériau de la bouteille → même teinte/rendu
// - Matériau "overlay" = ta texture, alpha, depthWrite off → imprime par-dessus
// - Si pas d’image: on masque l’overlay, on laisse le fill (même rendu que la bouteille)

let scene, camera, renderer, controls;
let resizeObserver3D = null;
let modelRoot = null;

// zones[zoneName] = { fill: Mesh, overlay: Mesh }
let zones = {};

let activeContainerId = null;
let activeCanvasId = null;
let pendingTextureUpdate = null;

function isSceneReady() {
  return !!(renderer && scene && camera && renderer.domElement);
}

function queuePendingTextureUpdate(url, zoneName) {
  if (!url) {
    pendingTextureUpdate = null;
    return;
  }
  pendingTextureUpdate = { url, zoneName: zoneName || null };
}

async function applyTextureFromURL(url, zoneName = null, { fromQueue = false } = {}) {
  if (!url) return;

  const sceneActive = isSceneReady();
  const zonesReady = Object.keys(zones).length > 0;

  if (!sceneActive || !zonesReady) {
    queuePendingTextureUpdate(url, zoneName);
    if (!fromQueue) {
      console.warn('[3D] Scene not ready yet → texture queued');
    }
    return;
  }

  const zone = getZone(zoneName);
  if (!zone) {
    if (!zonesReady) {
      queuePendingTextureUpdate(url, zoneName);
      if (!fromQueue) {
        console.warn('[3D] Zone not ready → texture queued');
      }
      return;
    }
    console.warn('[3D] Zone introuvable pour texture', zoneName);
    return;
  }

  const texLoader = new THREE.TextureLoader();
  texLoader.setCrossOrigin('anonymous');

  try {
    const tex = await texLoader.loadAsync(url);
    tex.flipY = false;
    if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace; else tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 1;
    tex.needsUpdate = true;

    const materialClone = zone.overlay.material.clone();
    materialClone.map = tex;
    materialClone.color.set(0xffffff);
    materialClone.transparent = true;
    materialClone.alphaTest = 0.01;
    materialClone.depthTest = true;
    materialClone.depthWrite = false;
    materialClone.needsUpdate = true;

    zone.overlay.material = materialClone;
    zone.overlay.visible = true;
    renderOnce();
  } catch (e) {
    console.error('[3D] ❌ Échec texture:', e);
  }
}

function flushPendingTextureUpdate() {
  if (!pendingTextureUpdate) return;
  const payload = pendingTextureUpdate;
  pendingTextureUpdate = null;
  applyTextureFromURL(payload.url, payload.zoneName, { fromQueue: true });
}

// —————————————— UI helpers ——————————————
function ensureLoadingOverlay(container, message = 'Chargement du modèle 3D…') {
  if (!container) return null;

  let overlay = container.querySelector('.loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.setAttribute('aria-hidden', 'false');
    overlay.innerHTML = `
      <div class="loading-spinner" role="status" aria-live="polite">
        <span class="sr-only">${message}</span>
      </div>
      <div class="loading-text" aria-hidden="true">${message}</div>
    `;
    container.appendChild(overlay);
  } else {
    updateOverlayMessage(overlay, message);
  }

  return overlay;
}

function updateOverlayMessage(overlay, message) {
  if (!overlay) return;
  const text = overlay.querySelector('.loading-text');
  if (text) text.textContent = message;
  const srOnly = overlay.querySelector('.sr-only');
  if (srOnly) srOnly.textContent = message;
}

function showLoadingOverlay(container, message = 'Chargement du modèle 3D…') {
  const overlay = ensureLoadingOverlay(container, message);
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
}

function hideLoadingOverlay(container) {
  if (!container) return;
  const overlay = container.querySelector('.loading-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
}

// —————————————— Échelle produit ——————————————
const productScales = { mug:[1.2,1.2,1.2], tumbler:[1.5,1.5,1.5], bottle:[2,2,2] };
function getScaleForProduct(modelUrl){
  const u = (modelUrl||'').toLowerCase();
  for(const k in productScales) if(u.includes(k)) return productScales[k];
  return [1,1,1];
}

// —————————————— Rendu / Cam ——————————————
function renderOnce(){ if(renderer && scene && camera) renderer.render(scene,camera); }

function fitCameraToObject(camera, object, controls, renderer, offset=2){
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x,size.y,size.z);
  const fov = camera.fov*Math.PI/180;
  const aspect = renderer.domElement.clientWidth / Math.max(1, renderer.domElement.clientHeight);
  let cameraZ = Math.abs(maxDim/(2*Math.tan(fov/2)));
  if(aspect<1) cameraZ/=aspect;
  cameraZ*=offset;
  camera.position.set(center.x,center.y,cameraZ);
  camera.lookAt(center);
  if(controls){ controls.target.copy(center); controls.update(); }
  renderOnce();
}

// —————————————— Helpers zones ——————————————
function getZone(zoneName=null){
  if(zoneName && zones[zoneName]) return zones[zoneName];
  // sinon, prend la première zone dont le nom contient "impression"
  const key = Object.keys(zones).find(n => n.toLowerCase().includes('impression'));
  return key ? zones[key] : null;
}

// —————————————— INIT (HDR par défaut + fallback) ——————————————
function init3DScene(containerId, modelUrl, canvasId='threeDCanvas', opts={}){
  const container = document.getElementById(containerId);
  let canvas = document.getElementById(canvasId);

  if (!container) {
    setTimeout(()=>init3DScene(containerId, modelUrl, canvasId, opts), 120);
    return;
  }

  showLoadingOverlay(container, 'Initialisation de la vue 3D…');

  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = canvasId;
    container.appendChild(canvas);
  }

  if(!canvas){
    setTimeout(()=>init3DScene(containerId, modelUrl, canvasId, opts), 120);
    return;
  }

  scene = new THREE.Scene();

  const rect = container.getBoundingClientRect();
  const width  = Math.max(1, rect.width);
  const height = Math.max(1, rect.height || rect.width);

  camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000);
  camera.position.set(0,0,0.7);

  renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true, preserveDrawingBuffer:true });
  if('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height, false);

  activeContainerId = containerId;
  activeCanvasId = canvasId;

  // HDRI par défaut (comme ton viewer)
  const defaultHdr = 'https://customiizer.blob.core.windows.net/assets/Hdr/rogland_clear_night_1k.hdr';
  const useHdr = opts.hdr !== 0 && opts.hdr !== false;
  const hdrUrl = (typeof opts.hdr==='string' && opts.hdr && opts.hdr!=='1') ? opts.hdr : defaultHdr;
  const hdrIntensity = Number.isFinite(opts.hdrIntensity) ? opts.hdrIntensity : 1.0;

  let environmentReady = false;
  const handleEnvironmentReady = () => {
    if (environmentReady) return;
    environmentReady = true;

    if (!modelUrl) {
      console.warn('[3D] Aucun modèle GLB fourni');
      hideLoadingOverlay(container);
      return;
    }

    showLoadingOverlay(container, 'Chargement du modèle 3D…');
    loadModel(modelUrl)
      .then(() => {
        hideLoadingOverlay(container);
        flushPendingTextureUpdate();
      })
      .catch((err) => {
        console.error('[3D] ❌ Échec chargement modèle', err);
        hideLoadingOverlay(container);
      });
  };

  if(useHdr){
    const pmrem = new THREE.PMREMGenerator(renderer);
    new THREE.RGBELoader().load(
      hdrUrl,
      (hdr)=>{
        const env = pmrem.fromEquirectangular(hdr).texture;
        scene.environment = env;
        scene.background  = null;
        renderer.toneMappingExposure = 1.2 * hdrIntensity;
        hdr.dispose?.(); pmrem.dispose();
        handleEnvironmentReady();
      },
      undefined,
      (err)=>{
        console.warn('⚠️ HDR KO → fallback lumières', err);
        const key  = new THREE.DirectionalLight(0xffffff, 1); key.position.set(5,6,4);
        const fill = new THREE.AmbientLight(0xffffff, 0.25);
        scene.add(key, fill);
        handleEnvironmentReady();
      }
    );
  } else {
    const key  = new THREE.DirectionalLight(0xffffff, 1); key.position.set(5,6,4);
    const fill = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(key, fill);
    handleEnvironmentReady();
  }

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enableZoom = false;

  if(resizeObserver3D) resizeObserver3D.disconnect();
  resizeObserver3D = new ResizeObserver(({0:{contentRect}})=>{
    const w = Math.max(1,contentRect.width), h = Math.max(1,contentRect.height);
    renderer.setSize(w,h,false);
    camera.aspect = w/h; camera.updateProjectionMatrix(); renderOnce();
  });
  resizeObserver3D.observe(container);

  animate();
}

// —————————————— LOAD MODEL (construit 2 couches par zone) ——————————————
function loadModel(modelUrl){
  return new Promise((resolve, reject) => {
    if (!modelUrl) {
      reject(new Error('Missing model URL'));
      return;
    }

    const loader = new THREE.GLTFLoader();
    loader.load(
      modelUrl,
      (gltf)=>{
        modelRoot = gltf.scene;
        zones = {};

        // 1) Trouver un matériau de **référence bouteille** (non "impression")
        let bottleRefMaterial = null;
        modelRoot.traverse((child)=>{
          if(!child.isMesh) return;
          const lname = (child.name || '').toLowerCase();
          const isImpression = lname.includes('impression');
          if(!isImpression && !bottleRefMaterial){
            // Premier matériau "corps" rencontré
            bottleRefMaterial = child.material;
          }
        });

        // 2) Pour chaque mesh "impression", créer 2 couches : fill + overlay
        modelRoot.traverse((child)=>{
          if(!child.isMesh) return;
          const lname = (child.name || '').toLowerCase();
          if(!lname.includes('impression')) return;

          const parent = child.parent;

          // Geometry et matrices identiques
          const geom = child.geometry;

          // — fill : clone du matériau BOUTEILLE (même teinte/rendu) — //
          let fillMat;
          if (bottleRefMaterial){
            fillMat = bottleRefMaterial.clone();
          } else {
            // fallback si pas trouvé (noir PBR neutre)
            fillMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1, metalness: 0 });
          }

          const fillMesh = new THREE.Mesh(geom, fillMat);
          fillMesh.name = child.name + '_Fill';
          // Copie des transforms locales
          fillMesh.position.copy(child.position);
          fillMesh.quaternion.copy(child.quaternion);
          fillMesh.scale.copy(child.scale);
          // Écrit la profondeur : il “bouche” le creux
          fillMesh.renderOrder = 1;
          parent.add(fillMesh);

          // — overlay : clone du matériau d’origine (indépendant), pas de map au départ — //
          const overlayMat = child.material.clone();
          overlayMat.map = null;
          overlayMat.color.set(0xffffff);
          overlayMat.transparent = true;   // on affichera l’image avec alpha
          overlayMat.alphaTest = 0.0;      // pas d’alphaTest tant qu’il n’y a pas d’image
          overlayMat.depthTest = true;
          overlayMat.depthWrite = false;   // ne bouche pas la bouteille/fill
          overlayMat.needsUpdate = true;

          const overlayMesh = new THREE.Mesh(geom, overlayMat);
          overlayMesh.name = child.name + '_Overlay';
          overlayMesh.position.copy(child.position);
          overlayMesh.quaternion.copy(child.quaternion);
          overlayMesh.scale.copy(child.scale);
          overlayMesh.renderOrder = 2;     // après le fill
          parent.add(overlayMesh);

          // On supprime l’ancien mesh child (remplacé par fill+overlay)
          child.visible = false;

          zones[child.name] = { fill: fillMesh, overlay: overlayMesh };
        });

        // Échelle & caméra
        const s = getScaleForProduct(modelUrl);
        modelRoot.scale.set(s[0], s[1], s[2]);
        scene.add(modelRoot);
        fitCameraToObject(camera, modelRoot, controls, renderer);
        renderOnce();
        resolve(modelRoot);
      },
      undefined,
      (err)=>{
        console.error('[3D] ❌ Erreur GLB:', err);
        reject(err);
      }
    );
  });
}

// —————————————— APPLIQUER IMAGE (overlay alpha, fill identique bouteille) ——————————————
window.update3DTextureFromCanvas = function(canvas, zoneName = null) {
  if (!canvas) {
    console.warn('[3D] Canvas manquant → texture ignorée');
    return;
  }
  try {
    const url = canvas.toDataURL('image/png');
    if (!url) {
      console.warn('[3D] toDataURL vide → texture ignorée');
      return;
    }
    applyTextureFromURL(url, zoneName);
  } catch (e) {
    console.error('[3D] ❌ Échec conversion canvas → texture', e);
  }
};

window.update3DTextureFromImageURL = function(imageUrl, zoneName = null) {
  if (!imageUrl) {
    console.warn('[3D] URL image manquante → texture ignorée');
    return;
  }
  applyTextureFromURL(imageUrl, zoneName);
};

// —————————————— RETIRER IMAGE (on garde le fill qui bouche le creux) ——————————————
window.clear3DTexture = function(zoneName=null){
  const zone = getZone(zoneName);
  if(!zone) return;

  // on masque simplement l’overlay
  zone.overlay.visible = false;

  // et on enlève la map si tu préfères (pas obligatoire)
  zone.overlay.material.map = null;
  zone.overlay.material.alphaTest = 0.0;
  zone.overlay.material.needsUpdate = true;

  renderOnce();
  pendingTextureUpdate = null;
};

// —————————————— Debug ——————————————
window.logZones = function(){
  const out = {};
  for(const k of Object.keys(zones)){
    out[k] = { fill: !!zones[k].fill, overlay: !!zones[k].overlay };
  }
  console.table(out);
};
window.dispose3DScene = function() {
  try {
    const disposedContainerId = activeContainerId;
    const disposedCanvasId = activeCanvasId;

    if (resizeObserver3D) {
      resizeObserver3D.disconnect();
      resizeObserver3D = null;
    }

    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss?.();
      const parentNode = renderer.domElement?.parentNode || null;
      if (parentNode) {
        const overlay = parentNode.querySelector('.loading-overlay');
        overlay?.remove();
        parentNode.removeChild(renderer.domElement);
      }
      renderer.domElement = null;
      renderer = null;
    }

    scene = null;
    camera = null;
    controls = null;
    modelRoot = null;
    zones = {};
    activeContainerId = null;
    activeCanvasId = null;
    threeDInitialized = false;

    console.log("🗑️ Three.js scene disposed");

    window.dispatchEvent(new CustomEvent('threeDSceneDisposed', {
      detail: {
        containerId: disposedContainerId || null,
        canvasId: disposedCanvasId || null
      }
    }));
  } catch (e) {
    console.warn("⚠️ Failed to dispose 3D scene", e);
  }
};

// —————————————— Loop ——————————————
function animate(){
  requestAnimationFrame(animate);
  if(controls) controls.update();
  if(renderer && scene && camera) renderer.render(scene, camera);
}

// —————————————— API ——————————————
window.init3DScene = init3DScene;
window.is3DSceneReady = isSceneReady;
window.getActive3DContainerId = function() { return activeContainerId; };
