// 📁 threeDManager.js

let scene, camera, renderer, controls;
let printableMeshes = {};
let resizeObserver3D = null;

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
    // Vérifie si le container et le canvas existent
    let container = document.getElementById(containerId);
    let canvas = document.getElementById(canvasId);

    if (!container || !canvas) {
        console.warn(`[3D] ⏳ Container ou canvas introuvable (${containerId}, ${canvasId}), nouvel essai...`);

        // Réessaie dans 100ms tant que le DOM n’est pas prêt
        setTimeout(() => {
            init3DScene(containerId, modelUrl, canvasId);
        }, 100);
        return;
    }

    // Ici le container et le canvas existent 👍
    show3DLoader(container);

    const rect = container.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height || width;

    // Scène & caméra
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0.7);
    camera.lookAt(0, 0, 0);

    // Lumières
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(3, 5, 3);
    scene.add(light);

    // Rendu
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height, false);
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Resize auto
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

            // Marquer zones imprimables
            if (name.startsWith("impression")) {
                printableMeshes[child.name] = child;
                child.material.userData.baseColor = child.material.color.getHex();
            }
        });

        scene.add(gltf.scene);
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

// --- API globale ---
window.update3DTextureFromCanvas = function (canvas, zoneName = null) {
    if (!canvas) return;
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.needsUpdate = true;

    let mesh = zoneName ? printableMeshes[zoneName] : Object.values(printableMeshes)[0];
    if (!mesh) {
        console.warn("[3D] ❌ Zone imprimable non trouvée :", zoneName);
        return;
    }

    mesh.material.map = texture;
    mesh.material.color.setHex(0xffffff); // neutraliser la teinte
    mesh.material.needsUpdate = true;
};

window.update3DTextureFromImageURL = function (url, zoneName = null) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
        const offscreen = document.createElement('canvas');
        offscreen.width = img.width;
        offscreen.height = img.height;
        const ctx = offscreen.getContext('2d');
        ctx.drawImage(img, 0, 0);
        window.update3DTextureFromCanvas(offscreen, zoneName);
    };
    img.onerror = () => console.warn('[3D] ❌ Échec du chargement texture :', url);
    img.src = url;
};

window.clear3DTexture = function (zoneName = null) {
    let mesh = zoneName ? printableMeshes[zoneName] : Object.values(printableMeshes)[0];
    if (!mesh) {
        console.warn("[3D] ❌ Zone imprimable non trouvée pour :", zoneName);
        return;
    }
    mesh.material.map = null;
    if (mesh.material.userData?.baseColor !== undefined) {
        mesh.material.color.setHex(mesh.material.userData.baseColor);
    }
    mesh.material.needsUpdate = true;
};
