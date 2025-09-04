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

    // Sauvegarde pour restauration ultérieure
    child.userData.baseColor    = (child.material?.color?.getHex?.() ?? 0xffffff);
    child.userData.origMaterial = child.material;

    // Rendre visible par défaut et éviter le z-fighting
    child.material.transparent   = false;
    child.material.opacity       = 1.0;
    child.material.alphaTest     = 0;
    child.material.blending      = THREE.NormalBlending;
    child.material.depthWrite    = true;
    child.material.colorWrite    = true;

    // Pousse très légèrement la zone vers la caméra
    child.material.polygonOffset       = true;
    child.material.polygonOffsetFactor = -2;
    child.material.polygonOffsetUnits  = -2;

    // S’assure que ça passe au-dessus si nécessaire
    child.renderOrder = 999;

    // Si jamais les normales sont bizarres :
    // child.material.side = THREE.DoubleSide;

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

// --- Public API ---
window.update3DTextureFromCanvas = function (canvas, zoneName = null) {
    const mesh = getPrintableMesh(zoneName);
    if (!mesh || !canvas) return;

    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY    = false;
    texture.encoding = THREE.sRGBEncoding;
    texture.needsUpdate = true;

    const mat = new THREE.MeshBasicMaterial({
        map: texture,
        color: 0xffffff,          // pas de teinte
        transparent: true,        // respecte l’alpha de l’image
        toneMapped: false         // évite la désaturation par tone mapping
    });

    // Anti z-fighting + priorité d’affichage
    mat.polygonOffset       = true;
    mat.polygonOffsetFactor = -2;
    mat.polygonOffsetUnits  = -2;

    mesh.material   = mat;
    mesh.renderOrder = 999;
    mesh.material.needsUpdate = true;

    console.log("[3D] ✅ Texture appliquée depuis Canvas sur", mesh.name);
};

window.update3DTextureFromImageURL = function (url, zoneName = null) {
    if (!url) return;
    const mesh = getPrintableMesh(zoneName);
    if (!mesh) return;

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(url, (texture) => {
        texture.flipY    = false;
        texture.encoding = THREE.sRGBEncoding;
        texture.needsUpdate = true;

        const mat = new THREE.MeshBasicMaterial({
            map: texture,
            color: 0xffffff,
            transparent: true,
            toneMapped: false
        });

        mat.polygonOffset       = true;
        mat.polygonOffsetFactor = -2;
        mat.polygonOffsetUnits  = -2;

        mesh.material   = mat;
        mesh.renderOrder = 999;
        mesh.material.needsUpdate = true;

        console.log("[3D] ✅ Texture appliquée depuis URL sur", mesh.name);
    }, undefined, (err) => {
        console.error("[3D] ❌ Erreur chargement texture :", err);
    });
};


window.clear3DTexture = function (zoneName = null) {
    const mesh = getPrintableMesh(zoneName);
    if (!mesh) return;

    // Si on a remplacé le matériau par un Basic, on libère proprement
    if (mesh.material && mesh.material !== mesh.userData.origMaterial) {
        if (mesh.material.map) {
            mesh.material.map.dispose();
        }
        mesh.material.dispose();
    }

    // Restore matériau GLB (couleur visible par défaut)
    if (mesh.userData.origMaterial) {
        mesh.material = mesh.userData.origMaterial;

        mesh.material.transparent   = false;
        mesh.material.opacity       = 1.0;
        mesh.material.alphaTest     = 0;
        mesh.material.blending      = THREE.NormalBlending;
        mesh.material.depthWrite    = true;
        mesh.material.colorWrite    = true;

        mesh.material.polygonOffset       = true;
        mesh.material.polygonOffsetFactor = -2;
        mesh.material.polygonOffsetUnits  = -2;

        mesh.renderOrder = 999;
        mesh.material.needsUpdate = true;
    }

    console.log("[3D] 🧹 Texture retirée, matériau d’origine restauré :", mesh.name);
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
