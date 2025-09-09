// 📁 threeDManager.js — version simple & robuste (logique viewer)

let scene, camera, renderer, controls;
let resizeObserver3D = null;
let modelRoot = null;
let printableMeshes = {}; // { meshName -> Mesh }

const productScales = {
  mug: [1.2, 1.2, 1.2],
  tumbler: [1.5, 1.5, 1.5],
  bottle: [2, 2, 2],
};

// ---------------- Utils ----------------
function getScaleForProduct(modelUrl) {
  const u = (modelUrl || '').toLowerCase();
  for (const k in productScales) if (u.includes(k)) return productScales[k];
  return [1, 1, 1];
}

function renderOnce() {
  if (renderer && scene && camera) renderer.render(scene, camera);
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
  renderOnce();
}

// ---------------- Init (HDR par défaut + fallback) ----------------
function init3DScene(containerId, modelUrl, canvasId = 'threeDCanvas', opts = {}) {
  const container = document.getElementById(containerId);
  const canvas = document.getElementById(canvasId);

  if (!container || !canvas) {
    console.warn(`[3D] Container/canvas introuvable (${containerId}, ${canvasId}), retry…`);
    setTimeout(() => init3DScene(containerId, modelUrl, canvasId, opts), 120);
    return;
  }

  // Options HDR
  const defaultHdr = 'https://customiizer.blob.core.windows.net/assets/Hdr/studio_country_hall_1k.hdr';
  const useHdr = opts.hdr !== 0 && opts.hdr !== false; // true par défaut
  const hdrUrl = (typeof opts.hdr === 'string' && opts.hdr && opts.hdr !== '1') ? opts.hdr : defaultHdr;
  const hdrIntensity = Number.isFinite(opts.hdrIntensity) ? opts.hdrIntensity : 1.0;

  // Scene/Camera
  scene = new THREE.Scene();

  const rect = container.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height || rect.width);

  camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 5000);
  camera.position.set(0, 0, 0.7);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2; // proche du viewer
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height, false);

  // HDRI / fallback lights
  if (useHdr) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    new THREE.RGBELoader().load(
      hdrUrl,
      (hdr) => {
        const env = pmrem.fromEquirectangular(hdr).texture;
        scene.environment = env;
        scene.background = null;
        renderer.toneMappingExposure = 1.2 * hdrIntensity;
        hdr.dispose?.(); pmrem.dispose();
        renderOnce();
        console.log('✅ HDR chargé:', hdrUrl, 'intensity≈', hdrIntensity);
      },
      undefined,
      (err) => {
        console.warn('⚠️ Échec HDR, fallback lumières', err);
        const key = new THREE.DirectionalLight(0xffffff, 1);
        key.position.set(5, 6, 4);
        const fill = new THREE.AmbientLight(0xffffff, 0.25);
        scene.add(key, fill);
        renderOnce();
      }
    );
  } else {
    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.position.set(5, 6, 4);
    const fill = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(key, fill);
  }

  // Controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;

  // Resize
  if (resizeObserver3D) resizeObserver3D.disconnect();
  resizeObserver3D = new ResizeObserver(entries => {
    const { width: w, height: h } = entries[0].contentRect;
    if (w > 0 && h > 0) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderOnce();
    }
  });
  resizeObserver3D.observe(container);

  // Charge modèle
  loadModel(modelUrl);

  // Loop
  animate();
}

// ---------------- Chargement modèle ----------------
function loadModel(modelUrl) {
  const loader = new THREE.GLTFLoader();
  loader.load(
    modelUrl,
    (gltf) => {
      modelRoot = gltf.scene;
      printableMeshes = {};

      modelRoot.traverse(child => {
        if (!child.isMesh) return;
        const lname = (child.name || '').toLowerCase();
        const mname = (child.material?.name || '').toLowerCase();
        const isPrintable = lname.startsWith('impression') || /impression/.test(mname);

        if (isPrintable) {
          // Sauvegarde un CLONE indépendant du matériau d’origine
          child.userData.baseMaterial = child.material.clone();
          printableMeshes[child.name] = child;
        }
      });

      const s = getScaleForProduct(modelUrl);
      modelRoot.scale.set(s[0], s[1], s[2]);
      scene.add(modelRoot);
      fitCameraToObject(camera, modelRoot, controls, renderer);

      console.log('[3D] ✅ Modèle chargé. Zones imprimables :', Object.keys(printableMeshes));
    },
    undefined,
    (err) => console.error('[3D] ❌ Erreur GLB:', err)
  );
}

// ---------------- Texture depuis Canvas (logique viewer) ----------------
window.update3DTextureFromCanvas = function (canvas, zoneName = null) {
  const mesh = getPrintableMesh(zoneName);
  if (!mesh || !canvas) return;

  // IMPORTANT : pas de fond opaque dans le canvas si tu veux garder la matière visible en “trou”.
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  else tex.encoding = THREE.SRGBEncoding;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 1;
  tex.needsUpdate = true;

  const mat = mesh.material.clone();
  mat.map = tex;
  mat.color.set(0xffffff); // éviter de teinter la texture
  // Pas de bricolage transparent/depth ici -> inutile si ta bouteille est creusée
  mat.needsUpdate = true;

  mesh.material = mat;
  renderOnce();
  console.log('🖼️ Texture appliquée sur', mesh.name, `(canvas ${canvas.width}×${canvas.height})`);
};

// ---------------- Retirer la texture = restaurer matériau d’origine ----------------
window.clear3DTexture = function (zoneName = null) {
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

// ---------------- Debug helpers (optionnels) ----------------
window.logPrintableMeshes = function () {
  console.table(Object.keys(printableMeshes));
};

// ---------------- Loop ----------------
function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

// ---------------- API ----------------
window.init3DScene = init3DScene;
window.getPrintableMesh = getPrintableMesh;
