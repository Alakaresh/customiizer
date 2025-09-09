// 📁 threeDManager.js

let scene, camera, renderer, controls;
let printableMeshes = {};
let resizeObserver3D = null;

const productScales = {
  mug: [1.2, 1.2, 1.2],
  tumbler: [1.5, 1.5, 1.5],
  bottle: [2, 2, 2],
};

// ----------------------- Utils -----------------------
function getScaleForProduct(modelUrl) {
  const lowerUrl = (modelUrl || '').toLowerCase();
  for (const key in productScales) {
    if (lowerUrl.includes(key)) {
      console.log(`[3D Debug] Produit détecté: "${key}" → Scale:`, productScales[key]);
      return productScales[key];
    }
  }
  console.log(`[3D Debug] Aucun produit détecté dans "${modelUrl}", scale par défaut [1,1,1]`);
  return [1, 1, 1];
}

function show3DLoader(container) {
  let loader = container.querySelector('.loading-overlay');
  if (!loader) {
    loader = document.createElement('div');
    loader.className = 'loading-overlay';
    loader.innerHTML = '<div class="loading-spinner"></div>';
    container.appendChild(loader);
  }
  loader.style.display = 'flex';
}

function hide3DLoader(container) {
  const loader = container.querySelector('.loading-overlay');
  if (loader) loader.remove();
}

// ----------------------- Scene init -----------------------
function init3DScene(containerId, modelUrl, canvasId = 'threeDCanvas') {
  const container = document.getElementById(containerId);
  const canvas = document.getElementById(canvasId);

  if (!container || !canvas) {
    console.warn(`[3D] ⏳ Container ou canvas introuvable (${containerId}, ${canvasId}), nouvel essai...`);
    setTimeout(() => init3DScene(containerId, modelUrl, canvasId), 100);
    return;
  }

  show3DLoader(container);

  const rect = container.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height || width;

  // Scene & camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 0, 0.7);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height, false);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  // HDRI (éclairage, pas de background)
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  new THREE.RGBELoader()
    .load('https://customiizer.blob.core.windows.net/assets/Hdr/brown_photostudio_01_1k.hdr', (hdr) => {
      const envMap = pmrem.fromEquirectangular(hdr).texture;
      scene.environment = envMap;
      scene.background = null;
      hdr.dispose();
      pmrem.dispose();
      console.log('✅ HDR chargé (sans background)');
    });

  // Resize
  if (resizeObserver3D) resizeObserver3D.disconnect();
  resizeObserver3D = new ResizeObserver((entries) => {
    const { width: w, height: h } = entries[0].contentRect;
    if (w > 0 && h > 0) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  });
  resizeObserver3D.observe(container);

  // Controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;

  // Model
  loadModel(modelUrl);

  // Loop
  animate();
}

// ----------------------- Impression state -----------------------
function setImpressionState(mesh, hasTexture) {
  const m = mesh.material;
  mesh.visible = true;

  if (hasTexture) {
    // --- overlay pour l’impression ---
    m.transparent = true;
    m.opacity = 1.0;
    m.alphaTest = 0.01;
    m.depthTest = true;
    m.depthWrite = false;           // ne “bouche” pas la bouteille
    m.polygonOffset = true;         // évite z-fighting si coplanaire
    m.polygonOffsetFactor = -1;
    m.polygonOffsetUnits = -1;
    m.color.setHex(0xffffff);       // pas de teinte sur la map
    m.side = THREE.FrontSide;
    mesh.renderOrder = 2;           // rendu après la base
  } else {
    // --- état normal (pas de texture) ---
    m.map = null;
    m.transparent = false;
    m.opacity = 1.0;
    m.alphaTest = 0.0;
    m.depthTest = true;
    m.depthWrite = true;
    m.polygonOffset = false;
    m.side = THREE.FrontSide;
    mesh.renderOrder = 1;

    // Restaurer look d’origine
    const base = mesh.userData.baseMaterial;
    if (base) {
      m.color.copy(base.color);
      if ('roughness' in m && 'roughness' in base) m.roughness = base.roughness;
      if ('metalness' in m && 'metalness' in base) m.metalness = base.metalness;
    }
  }

  m.toneMapped = true;
  m.needsUpdate = true;
}

// ----------------------- Load GLB -----------------------
function loadModel(modelUrl) {
  const loader = new THREE.GLTFLoader();
  loader.load(
    modelUrl,
    (gltf) => {
      printableMeshes = {};

      gltf.scene.traverse((child) => {
        if (!child.isMesh) return;

        const lower = child.name.toLowerCase();

        if (lower.startsWith('impression')) {
          // Sauvegarde matériau d’origine, puis clone pour instance indépendante
          child.userData.baseMaterial = child.material;
          child.material = child.material.clone();

          printableMeshes[child.name] = child;
          setImpressionState(child, false); // visible, pas de texture

          // Assure l’ordre de rendu vs base
          child.renderOrder = 2;
        } else {
          // La bouteille / autres meshes
          child.renderOrder = 1;
        }
      });

      scene.add(gltf.scene);

      // Scale & camera
      const scale = getScaleForProduct(modelUrl);
      gltf.scene.scale.set(scale[0], scale[1], scale[2]);
      fitCameraToObject(camera, gltf.scene, controls, renderer);

      hide3DLoader(renderer.domElement.parentElement);
      console.log('[3D] ✅ Modèle chargé :', modelUrl);
    },
    undefined,
    (error) => {
      console.error('[3D] ❌ Erreur chargement modèle :', error);
      hide3DLoader(renderer.domElement.parentElement);
    }
  );
}

// ----------------------- Render loop -----------------------
function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

// ----------------------- Helpers -----------------------
function getPrintableMesh(zoneName) {
  if (!zoneName) {
    const firstKey = Object.keys(printableMeshes)[0];
    return firstKey ? printableMeshes[firstKey] : null;
  }
  const key = Object.keys(printableMeshes).find(
    (n) => n.toLowerCase() === zoneName.toLowerCase()
  );
  return key ? printableMeshes[key] : null;
}

function fitCameraToObject(camera, object, controls, renderer, offset = 2) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
  const fov = (camera.fov * Math.PI) / 180;

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

// ----------------------- Public API -----------------------
window.init3DScene = init3DScene;

window.update3DTextureFromCanvas = function (canvas, zoneName = null) {
  const mesh = getPrintableMesh(zoneName);
  if (!mesh || !canvas) return;

  // Canvas → texture avec alpha (fond transparent)
  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const ctx = off.getContext('2d');
  ctx.clearRect(0, 0, off.width, off.height);
  ctx.drawImage(canvas, 0, 0);

  const tex = new THREE.CanvasTexture(off);
  tex.flipY = false;
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  else tex.encoding = THREE.sRGBEncoding;
  tex.premultiplyAlpha = true;
  tex.needsUpdate = true;

  mesh.material.map = tex;
  setImpressionState(mesh, true); // passe en mode overlay
};

window.clear3DTexture = function (zoneName = null) {
  const mesh = getPrintableMesh(zoneName);
  if (!mesh) return;
  // retire la map + repasse en état normal (opaque)
  setImpressionState(mesh, false);
};

window.logPrintableMeshPosition = function (zoneName = null) {
  const mesh = getPrintableMesh(zoneName);
  if (mesh) {
    console.log('[3D] 🎯 Printable mesh:', mesh.name, mesh.position, mesh.rotation, mesh.scale);
  } else {
    console.warn('[3D] 🚫 Aucune zone imprimable trouvée pour', zoneName);
  }
};
