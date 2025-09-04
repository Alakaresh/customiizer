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
// --- Appliquer une texture depuis Canvas ---
window.update3DTextureFromCanvas = function (canvas, zoneName = null) {
    const mesh = getPrintableMesh(zoneName);
    if (!mesh || !canvas) return;

    let baseColor = mesh.userData?.baseColor ?? 0xffffff;
    let baseMap = mesh.userData?.baseMap ?? null;

    // --- Vérifier si le canvas contient de la transparence ---
    const ctxCheck = canvas.getContext("2d");
    const pixels = ctxCheck.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasTransparency = false;
    let fullyOpaque = true;
    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 255) hasTransparency = true;
        if (pixels[i] !== 255) fullyOpaque = false;
    }

    // --- Offscreen ---
    const offscreen = document.createElement("canvas");
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext("2d");

    if (hasTransparency) {
        // Cas 1 : image avec zones transparentes → on garde la couleur de fond
        if (baseMap?.image) {
            ctx.drawImage(baseMap.image, 0, 0, offscreen.width, offscreen.height);
            console.log("[3D Debug] Fond → baseMap dessinée");
        } else {
            ctx.fillStyle = "#" + baseColor.toString(16).padStart(6, "0");
            ctx.fillRect(0, 0, offscreen.width, offscreen.height);
            console.log("[3D Debug] Fond → couleur appliquée", ctx.fillStyle);
        }
    } else if (!fullyOpaque) {
        // Cas 2 : pas transparent mais le design ne couvre pas tout → fond couleur
        ctx.fillStyle = "#" + baseColor.toString(16).padStart(6, "0");
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
        console.log("[3D Debug] Fond → couleur appliquée (zone non remplie)");
    } else {
        // Cas 3 : image totalement opaque et couvrant tout → pas de fond
        console.log("[3D Debug] Aucun fond appliqué (canvas plein)");
    }

    // Dessin de l'image par-dessus
    ctx.drawImage(canvas, 0, 0);
    console.log("[3D Debug] Canvas personnalisé dessiné");

    // --- Texture finale ---
    const texture = new THREE.CanvasTexture(offscreen);
    texture.flipY = false;
    texture.encoding = THREE.sRGBEncoding;
    texture.needsUpdate = true;

    mesh.material.map = texture;
    mesh.material.needsUpdate = true;

    console.log("[3D] ✅ Texture finale appliquée sur", mesh.name, 
                "(hasTransparency:", hasTransparency, "fullyOpaque:", fullyOpaque, ")");
};


// 📌 Nettoyer la texture et restaurer la couleur
window.clear3DTexture = function (zoneName = null) {
    const mesh = getPrintableMesh(zoneName);
    if (!mesh) return;

    mesh.material = new THREE.MeshBasicMaterial({
        color: mesh.material.userData?.baseColor || 0xffffff
    });
    mesh.material.needsUpdate = true;

    console.log("[3D] 🧹 Texture retirée, couleur restaurée :", mesh.name);
};

// 📌 Debug
window.logPrintableMeshPosition = function (zoneName = null) {
    const mesh = getPrintableMesh(zoneName);
    if (mesh) {
        console.log("[3D] 🎯 Printable mesh:", mesh.name, mesh.position, mesh.rotation, mesh.scale);
    } else {
        console.warn("[3D] 🚫 Aucune zone imprimable trouvée pour", zoneName);
    }
};
