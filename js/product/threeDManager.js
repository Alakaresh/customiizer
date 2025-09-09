// 📁 threeDManager.js — version “logique viewer”
// - Pas d’états opaques/overlay compliqués
// - On garde le matériau d’origine (clone sauvegardé), et on applique la map comme dans le viewer
// - Si aucune texture: matériau original visible (ex: noir PBR)
// - Si texture: clone + map + color = blanc (pour ne pas teinter la texture)

let scene, camera, renderer, controls;
let resizeObserver3D = null;
let printableMeshes = {}; // { name -> Mesh }
let modelRoot = null;

const productScales = {
  mug: [1.2, 1.2, 1.2],
  tumbler: [1.5, 1.5, 1.5],
  bottle: [2, 2, 2],
};

// ---------- Utils ----------
function getScaleForProduct(modelUrl) {
  const u = (modelUrl || '').toLowerCase();
  for (const k in productScales) {
    if (u.includes(k)) return productScales[k];
  }
  return [1, 1, 1];
}

function firstPrintableMesh() {
  const keys = Object.keys(printableMeshes);
  return keys.length ? printableMeshes[keys[0]] : null;
}

function getPrintableMesh(zoneName) {
  if (!zoneName) return firstPrintableMesh();
  const key = Object.keys(printableMeshes).find(n => n.toLowerCase() === zoneName.toLowerCase());
  return key ? printableMeshes[key] : null;
}

// ---------- Init ----------
function init3DScene(containerId, modelUrl, canvasId = 'threeDCanvas', opts = {}) {
  const container = document.getElementById(containerId);
  const canvas = document.getElementById(canvasId);
  if (!container || !canvas) {
    console.warn(`[3D] Container/canvas introuvable (${containerId}, ${canvasId}), retry...`);
    setTimeout(() => init3DScene(containerId, modelUrl, canvasId, opts), 120);
    return;
  }

  // Scene + Camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75,
    Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight || container.clientWidth),
    0.01, 5000
  );
  camera.position.set(0, 0, 0.7);

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  // Color mgmt moderne (r15+)
  if ('outputColorSpace' in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight || container.clientWidth, false);

  // (Optionnel) HDRI simple comme le viewer
  if (opts.hdrUrl) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const isExr = opts.hdrUrl.toLowerCase().endsWith('.exr');
    const Loader = isExr ? THREE.EXRLoader : THREE.RGBELoader;
    new Loader().load(opts.hdrUrl, (hdr) => {
      const env = pmrem.fromEquirectangular(hdr).texture;
      scene.environment = env;
      scene.background = null;
      hdr.dispose?.();
      pmrem.dispose();
      renderOnce();
    }, undefined, (e) => console.warn('[3D] HDR load error', e));
  }

  // Controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;

  // Resize
  if (resizeObserver3D) resizeObserver3D.disconnect();
  resizeObserver3D = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect;
    if (width > 0 && height > 0) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderOnce();
    }
  });
  resizeObserver3D.observe(container);

  // Load model
  loadModel(modelUrl);
  animate();
}

// ---------- Load model ----------
function loadModel(modelUrl) {
  const loader = new THREE.GLTFLoader();
  loader.load(modelUrl, (gltf) => {
    modelRoot = gltf.scene;
    printableMeshes = {};

    // Détection des zones imprimables :
    // - priorité aux noms qui commencent par "impression"
    // - sinon, si le nom de matériau contient "impression"
    modelRoot.traverse(child => {
      if (!child.isMesh) return;
      const lname = (child.name || '').toLowerCase();
      const matName = (child.material?.name || '').toLowerCase();
      const isPrintable = lname.startsWith('impression') || /impression/.test(matName);

      if (isPrintable) {
        // Sauvegarde un CLONE du matériau d’origine
        child.userData.baseMaterial = child.material.clone();
        printableMeshes[child.name] = child;
      }
    });

    // Échelle produit & placement caméra
    const s = getScaleForProduct(modelUrl);
    modelRoot.scale.set(s[0], s[1], s[2]);
    scene.add(modelRoot);
    fitCameraToObject(camera, modelRoot, controls, renderer);
    renderOnce();

    console.log('[3D] ✅ Modèle chargé, zones imprimables:', Object.keys(printableMeshes));
  }, undefined, (err) => {
    console.error('[3D] ❌ Erreur GLB:', err);
  });
}

// ---------- Texture depuis Canvas (logique viewer) ----------
window.update3DTextureFromCanvas = function update3DTextureFromCanvas(canvas, zoneName = null) {
  const mesh = getPrintableMesh(zoneName);
  if (!mesh || !canvas) return;

  // ATTENTION: ton canvas doit avoir un fond transparent si tu veux “voir” le matériau sous-jacent.
  // (ex: dans Fabric.js, pas de backgroundColor opaque)
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  else tex.encoding = THREE.SRGBEncoding;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 1;
  tex.needsUpdate = true;

  // Clone du matériau courant + map (exactement comme le viewer)
  const mat = mesh.material.clone();
  mat.map = tex;
  mat.color.set(0xffffff); // important: ne pas teinter la texture
  // NE PAS toucher à transparent / depthWrite / alphaTest ici → pas nécessaire si ta bouteille est creusée
  mat.needsUpdate = true;

  mesh.material = mat;
  renderOnce();

  console.log('🖼️ Texture appliquée sur', mesh.name, `(canvas ${canvas.width}×${canvas.height})`);
};

// ---------- Retirer texture = restaurer matériau d’origine ----------
window.clear3DTexture = function clear3DTexture(zoneName = null) {
  const mesh = getPrintableMesh(zoneName);
  if (!mesh) return;

  const base = mesh.userData.baseMaterial;
  if (base) {
    mesh.material = base.clone();
    mesh.material.needsUpdate = true;
    renderOnce();
    console.log('🧹 Texture retirée, matériau restauré sur', mesh.name);
  } else {
    console.warn('⚠️ Pas de baseMaterial sauvegardé pour', mesh.name);
  }
};

// ---------- Helpers ----------
function fitCameraToObject(camera, object, controls, renderer, offset = 2) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * Math.PI / 180;
  const aspect = renderer.domElement.clientWidth / Math.max(1, renderer.domElement.clientHeight);
  let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
  if (aspect < 1) cameraZ /= aspect;
  cameraZ *= offset;

  camera.position.set(center.x, center.y, cameraZ);
  camera.lookAt(center);

  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}
function renderOnce() {
  if (renderer && scene && camera) renderer.render(scene, camera);
}

// ---------- API export ----------
window.init3DScene = init3DScene;
window.logPrintableMeshes = function () {
  console.table(Object.keys(printableMeshes));
};
window.getPrintableMesh = getPrintableMesh;
