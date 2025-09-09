// 📁 threeDManager.js

let scene, camera, renderer, controls;
let printableMeshes = {};
let resizeObserver3D = null;

const productScales = {
  mug: [1.2, 1.2, 1.2],
  tumbler: [1.5, 1.5, 1.5],
  bottle: [2, 2, 2],
};

// ---------------- Utils ----------------
function getScaleForProduct(modelUrl) {
  const lowerUrl = (modelUrl || "").toLowerCase();
  for (const key in productScales) {
    if (lowerUrl.includes(key)) {
      console.log(`[3D Debug] Produit détecté: "${key}" → Scale:`, productScales[key]);
      return productScales[key];
    }
  }
  return [1, 1, 1];
}

function show3DLoader(container) {
  let loader = container.querySelector(".loading-overlay");
  if (!loader) {
    loader = document.createElement("div");
    loader.className = "loading-overlay";
    loader.innerHTML = '<div class="loading-spinner"></div>';
    container.appendChild(loader);
  }
  loader.style.display = "flex";
}
function hide3DLoader(container) {
  const loader = container.querySelector(".loading-overlay");
  if (loader) loader.remove();
}

// ---------------- Scene ----------------
function init3DScene(containerId, modelUrl, canvasId = "threeDCanvas") {
  const container = document.getElementById(containerId);
  const canvas = document.getElementById(canvasId);
  if (!container || !canvas) {
    setTimeout(() => init3DScene(containerId, modelUrl, canvasId), 100);
    return;
  }

  show3DLoader(container);

  const rect = container.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height || width;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 5000);
  camera.position.set(0, 0, 0.7);

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height, false);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  // HDRI
  const pmrem = new THREE.PMREMGenerator(renderer);
  new THREE.RGBELoader().load(
    "https://customiizer.blob.core.windows.net/assets/Hdr/brown_photostudio_01_1k.hdr",
    (hdr) => {
      const envMap = pmrem.fromEquirectangular(hdr).texture;
      scene.environment = envMap;
      scene.background = null;
      hdr.dispose();
      pmrem.dispose();
    }
  );

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

  loadModel(modelUrl);
  animate();
}

// ---------------- Impression state ----------------
function setImpressionState(mesh, hasTexture, texture = null) {
  const m = mesh.material;

  if (hasTexture && texture) {
    // --- avec texture ---
    m.map = texture;
    m.color.setHex(0xffffff);     // ne pas teinter la map
    m.transparent = true;
    m.opacity = 1.0;
    m.alphaTest = 0.01;
    m.depthWrite = false;         // pour éviter de boucher la bouteille
    m.depthTest = true;
    m.side = THREE.DoubleSide;
    m.needsUpdate = true;
    mesh.renderOrder = 2000;
  } else {
    // --- sans texture (surface visible en noir mat) ---
    m.map = null;
    m.color.setHex(0x000000);     // noir mat
    m.transparent = false;
    m.opacity = 1.0;
    m.alphaTest = 0.0;
    m.depthWrite = true;
    m.depthTest = true;
    m.side = THREE.DoubleSide;
    m.needsUpdate = true;
    mesh.renderOrder = 1;
  }
}



// ---------------- Load GLB ----------------
function loadModel(modelUrl) {
  const loader = new THREE.GLTFLoader();
  loader.load(
    modelUrl,
    (gltf) => {
      printableMeshes = {};

      gltf.scene.traverse((child) => {
        if (!child.isMesh) return;
        const lower = child.name.toLowerCase();

        if (lower.startsWith("impression")) {
          child.userData.baseMaterial = child.material.clone(); // copie indépendante
          child.material = child.material.clone();
          printableMeshes[child.name] = child;
          setImpressionState(child, false);
        }
      });

      scene.add(gltf.scene);

      const scale = getScaleForProduct(modelUrl);
      gltf.scene.scale.set(scale[0], scale[1], scale[2]);
      fitCameraToObject(camera, gltf.scene, controls, renderer);

      hide3DLoader(renderer.domElement.parentElement);
      console.log("[3D] ✅ Modèle chargé :", modelUrl);
    },
    undefined,
    (err) => {
      console.error("[3D] ❌ Erreur chargement modèle :", err);
      hide3DLoader(renderer.domElement.parentElement);
    }
  );
}
scene.traverse(obj => {
  if (obj.isMesh && obj.name.toLowerCase().startsWith("impression")) {
    console.log("[DEBUG] Matériau impression au chargement :", obj.material);
    obj.material.wireframe = true; // pour vérifier qu’il est toujours rendu
  }
});

// ---------------- Loop ----------------
function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

// ---------------- Helpers ----------------
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

// ---------------- API ----------------
window.init3DScene = init3DScene;

window.update3DTextureFromCanvas = function (canvas, zoneName = null) {
  const mesh = getPrintableMesh(zoneName);
  if (!mesh || !canvas) return;

  const off = document.createElement("canvas");
  off.width = canvas.width;
  off.height = canvas.height;
  const ctx = off.getContext("2d");

  ctx.clearRect(0, 0, off.width, off.height);
  ctx.drawImage(canvas, 0, 0);

  const tex = new THREE.CanvasTexture(off);
  tex.flipY = false;
  if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
  else tex.encoding = THREE.sRGBEncoding;
  tex.premultiplyAlpha = true;
  tex.needsUpdate = true;

  setImpressionState(mesh, true, tex);
};
window.clear3DTexture = function (zoneName = null) {
  const mesh = getPrintableMesh(zoneName);
  if (!mesh) return;
  setImpressionState(mesh, false);
};


window.logPrintableMeshPosition = function (zoneName = null) {
  const mesh = getPrintableMesh(zoneName);
  if (mesh) {
    console.log(
      "[3D] 🎯 Printable mesh:",
      mesh.name,
      mesh.position,
      mesh.rotation,
      mesh.scale
    );
  } else {
    console.warn("[3D] 🚫 Aucune zone imprimable trouvée pour", zoneName);
  }
};
