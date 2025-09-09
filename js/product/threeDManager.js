// 📁 threeDManager.js

let scene, camera, renderer, controls;
let printableMeshes = {};
let resizeObserver3D = null;

const productScales = {
    mug: [1.2, 1.2, 1.2],
    tumbler: [1.5, 1.5, 1.5],
    bottle: [2, 2, 2],
};

// --- Détection du scale par URL ---
function getScaleForProduct(modelUrl) {
    const lowerUrl = modelUrl.toLowerCase();
    for (const key in productScales) {
        if (lowerUrl.includes(key)) {
            console.log(`[3D Debug] Produit détecté: "${key}" → Scale:`, productScales[key]);
            return productScales[key];
        }
    }
    console.log(`[3D Debug] Aucun produit détecté dans "${modelUrl}", scale par défaut [1,1,1]`);
    return [1, 1, 1]; // fallback
}

// --- Loader UI ---
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

// --- Init scene ---
function init3DScene(containerId, modelUrl, canvasId = 'threeDCanvas') {
    let container = document.getElementById(containerId);
    let canvas = document.getElementById(canvasId);

    if (!container || !canvas) {
        console.warn(`[3D] ⏳ Container ou canvas introuvable (${containerId}, ${canvasId}), nouvel essai...`);
        setTimeout(() => {
            init3DScene(containerId, modelUrl, canvasId);
        }, 100);
        return;
    }

    show3DLoader(container);

    const rect = container.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height || width;

    // Scène & caméra
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0.7);
    camera.lookAt(0, 0, 0);

    // --- Renderer ---
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

    // --- HDR Environment ---
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    new THREE.RGBELoader()
        .load('https://customiizer.blob.core.windows.net/assets/Hdr/brown_photostudio_01_1k.hdr', function (hdrEquirect) {
            const envMap = pmremGenerator.fromEquirectangular(hdrEquirect).texture;

            scene.environment = envMap; // sert pour l’éclairage et reflets
            scene.background = null;    // fond neutre (pas d’HDR visible)

            hdrEquirect.dispose();
            pmremGenerator.dispose();

            console.log("✅ HDR chargé sans background, éclairage actif !");
        });

    // --- Resize auto ---
    if (resizeObserver3D) resizeObserver3D.disconnect();
    resizeObserver3D = new ResizeObserver(entries => {
        const { width: w, height: h } = entries[0].contentRect;
        if (w > 0 && h > 0) {
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
    });
    resizeObserver3D.observe(container);

    // Contrôles
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = false;

    // Charger modèle
    loadModel(modelUrl);

    animate();
}

// --- Load GLB ---
function loadModel(modelUrl) {
    const loader = new THREE.GLTFLoader();
    loader.load(modelUrl, (gltf) => {
        printableMeshes = {};

        gltf.scene.traverse((child) => {
            if (!child.isMesh) return;
            const name = child.name.toLowerCase();

            if (name.startsWith("impression")) {
                printableMeshes[child.name] = child;

                // Sauvegarde couleur + map d’origine
                child.userData.baseColor = child.material.color.getHex();
                if (child.material.map) {
                    child.userData.baseMap = child.material.map.clone();
                }

                child.material.transparent = false;
                child.material.opacity = 1.0;
                child.material.needsUpdate = true;
            }
        });

        scene.add(gltf.scene);
        fitCameraToObject(camera, gltf.scene, controls, renderer);
        const scale = getScaleForProduct(modelUrl);
        gltf.scene.scale.set(scale[0], scale[1], scale[2]);
        console.log(`[3D Debug] Scale appliqué: ${scale} à`, gltf.scene);
        hide3DLoader(renderer.domElement.parentElement);
        console.log("[3D] ✅ Modèle chargé :", modelUrl);
    }, undefined, (error) => {
        console.error("[3D] ❌ Erreur chargement modèle :", error);
        hide3DLoader(renderer.domElement.parentElement);
    });
}

// --- Render loop ---
function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// --- Helpers ---
function getPrintableMesh(zoneName) {
    if (!zoneName) {
        const firstKey = Object.keys(printableMeshes)[0];
        return firstKey ? printableMeshes[firstKey] : null;
    }

    const key = Object.keys(printableMeshes).find(
        name => name.toLowerCase() === zoneName.toLowerCase()
    );
    return key ? printableMeshes[key] : null;
}

function fitCameraToObject(camera, object, controls, renderer, offset = 2) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);

    // Récupère l'aspect ratio réel du canvas
    const aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;

    // Distance nécessaire selon la FOV verticale
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2)));

    // Ajustement selon l’aspect ratio
    if (aspect < 1) {
        cameraZ /= aspect;
    }

    cameraZ *= offset;

    // Place la caméra
    camera.position.set(center.x, center.y, cameraZ);
    camera.lookAt(center);

    // Mise à jour des contrôles
    if (controls) {
        controls.target.copy(center);
        controls.update();
    }
}

// --- Appliquer une texture depuis Canvas ---
window.update3DTextureFromCanvas = function (canvas, zoneName = null) {
  const mesh = getPrintableMesh(zoneName);
  if (!mesh || !canvas) return;

  // Clone le matériau pour ne pas casser celui d’origine
  if (!mesh.userData.baseMaterial) {
    mesh.userData.baseMaterial = mesh.material;        // garde une référence
    mesh.material = mesh.material.clone();             // clone pour l'impression
  }

  // Canvas → texture SANS fond peint
  const offscreen = document.createElement("canvas");
  offscreen.width = canvas.width;
  offscreen.height = canvas.height;
  const ctx = offscreen.getContext("2d");

  // ⚠️ pas de fillRect noir : on veut un fond transparent
  ctx.clearRect(0, 0, offscreen.width, offscreen.height);
  ctx.drawImage(canvas, 0, 0);

  const texture = new THREE.CanvasTexture(offscreen);
  texture.flipY = false;
  // three r15x : utilisez colorSpace si dispo
  if ('colorSpace' in texture) texture.colorSpace = THREE.SRGBColorSpace;
  else texture.encoding = THREE.sRGBEncoding;
  texture.needsUpdate = true;

  mesh.material.map = texture;
  // ne pas forcer le matériau en blanc, on garde sa couleur/params PBR
  // mesh.material.color = mesh.material.color; // inchangé
  mesh.material.transparent = true;
  mesh.material.alphaTest = 0.001;     // évite halo sombre sur les bords
  mesh.material.toneMapped = true;     // reste cohérent avec la scène
  mesh.material.needsUpdate = true;
};


// --- Nettoyer la texture et restaurer la couleur ---
window.clear3DTexture = function (zoneName = null) {
  const mesh = getPrintableMesh(zoneName);
  if (!mesh) return;
  if (mesh.userData.baseMaterial) mesh.material = mesh.userData.baseMaterial;
  else { mesh.material.map = null; mesh.material.needsUpdate = true; }
};


// --- Debug ---
window.logPrintableMeshPosition = function (zoneName = null) {
    const mesh = getPrintableMesh(zoneName);
    if (mesh) {
        console.log("[3D] 🎯 Printable mesh:", mesh.name, mesh.position, mesh.rotation, mesh.scale);
    } else {
        console.warn("[3D] 🚫 Aucune zone imprimable trouvée pour", zoneName);
    }
};
