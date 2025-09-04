// 📁 threeDManager.js

let scene, camera, renderer, controls;
let printableMeshes = {};
let printableEdges  = {};
let resizeObserver3D = null;

/* ---------------- Loader UI ---------------- */
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

/* ---------------- Init scene ---------------- */
function init3DScene(containerId, modelUrl, canvasId = 'threeDCanvas') {
    const container = document.getElementById(containerId);
    const canvas    = document.getElementById(canvasId);

    if (!container || !canvas) {
        console.warn(`[3D] ⏳ Container ou canvas introuvable (${containerId}, ${canvasId}), nouvel essai...`);
        setTimeout(() => init3DScene(containerId, modelUrl, canvasId), 100);
        return;
    }

    show3DLoader(container);

    const rect = container.getBoundingClientRect();
    let width  = rect.width;
    let height = rect.height || width;

    // Scène & caméra
    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0.7);
    camera.lookAt(0, 0, 0);

    // Lumières
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(3, 5, 3);
    scene.add(light);

    // Rendu
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height, false);
    // Compatible anciennes versions de three
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

/* ---------------- Utils: dispose ---------------- */
function disposeMaterial(mat) {
    if (!mat) return;
    if (mat.map) { mat.map.dispose(); mat.map = null; }
    if (mat.alphaMap) { mat.alphaMap.dispose(); mat.alphaMap = null; }
    mat.dispose?.();
}

/* ---------------- Création matériaux ---------------- */
// Matériau d’aperçu: semi-transparent, au-dessus de la surface, visible sans lumière
function makePreviewMaterial() {
    return new THREE.MeshBasicMaterial({
        color: 0x00e5ff,          // cyan/bleu lisible
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,  // tire vers la caméra pour éviter le z-fight
        polygonOffsetUnits: -1
    });
}

// Matériau texturé pour la zone d’impression
function makeTexturedMaterial(texture) {
    return new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.01,          // meilleure coupe des pixels 100% transparents
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });
}

/* ---------------- Load GLB ---------------- */
function loadModel(modelUrl) {
    const loader = new THREE.GLTFLoader();
    loader.load(modelUrl, (gltf) => {
        printableMeshes = {};
        printableEdges  = {};

        gltf.scene.traverse((child) => {
            if (!child.isMesh) return;
            const name = child.name.toLowerCase();

            if (name.startsWith("impression")) {
                printableMeshes[child.name] = child;

                // Sauvegarde de l'original (au cas où)
                child.userData.originalMaterial = child.material;
                child.material = makePreviewMaterial(); // ► visible tout de suite

                // Contour lisible
                const edgeGeom = new THREE.EdgesGeometry(child.geometry, 40); // thresholdAngle
                const edgeMat  = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.8 });
                const edges    = new THREE.LineSegments(edgeGeom, edgeMat);
                edges.name = `${child.name}_edges`;
                edges.renderOrder = (child.renderOrder || 0) + 1;

                // Attache au mesh pour suivre les transforms
                child.add(edges);
                printableEdges[child.name] = edges;
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

/* ---------------- Render loop ---------------- */
function animate() {
    requestAnimationFrame(animate);
    controls?.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

/* ---------------- Helpers ---------------- */
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

function setEdgesVisible(mesh, visible) {
    const edges = printableEdges[mesh.name];
    if (edges) edges.visible = visible;
}

/* ---------------- Public API ---------------- */
// 📌 Appliquer une texture depuis un canvas
window.update3DTextureFromCanvas = function (canvas, zoneName = null) {
    const mesh = getPrintableMesh(zoneName);
    if (!mesh || !canvas) return;

    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false;
    texture.encoding = THREE.sRGBEncoding;
    texture.needsUpdate = true;

    // Nettoie l'ancien matériau si on re-applique
    if (mesh.material && mesh.material !== mesh.userData.originalMaterial && mesh.material !== mesh.userData.previewMaterial) {
        disposeMaterial(mesh.material);
    }

    mesh.material = makeTexturedMaterial(texture);
    setEdgesVisible(mesh, true); // garde le contour

    console.log("[3D] ✅ Texture appliquée depuis Canvas sur", mesh.name);
};

// 📌 Appliquer une texture depuis une URL
window.update3DTextureFromImageURL = function (url, zoneName = null) {
    if (!url) return;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(url, (texture) => {
        const mesh = getPrintableMesh(zoneName);
        if (!mesh) return;

        texture.flipY = false;
        texture.encoding = THREE.sRGBEncoding;
        texture.needsUpdate = true;

        if (mesh.material && mesh.material !== mesh.userData.originalMaterial && mesh.material !== mesh.userData.previewMaterial) {
            disposeMaterial(mesh.material);
        }

        mesh.material = makeTexturedMaterial(texture);
        setEdgesVisible(mesh, true);

        console.log("[3D] ✅ Texture appliquée depuis URL sur", mesh.name);
    }, undefined, (err) => {
        console.error("[3D] ❌ Erreur chargement texture :", err);
    });
};

// 📌 Nettoyer la texture et restaurer l'aperçu
window.clear3DTexture = function (zoneName = null) {
    const mesh = getPrintableMesh(zoneName);
    if (!mesh) return;

    // Dispose le matériau texturé courant si nécessaire
    if (mesh.material && mesh.material.map) {
        disposeMaterial(mesh.material);
    }

    // (Re)crée le matériau d’aperçu si besoin puis réassigne
    if (!mesh.userData.previewMaterial) {
        mesh.userData.previewMaterial = makePreviewMaterial();
    }
    mesh.material = mesh.userData.previewMaterial ?? makePreviewMaterial();
    setEdgesVisible(mesh, true);

    console.log("[3D] 🧹 Texture retirée, aperçu restauré :", mesh.name);
};

// 📌 Afficher / masquer l’aperçu des zones d’impression (teinte + contour)
window.setPrintAreaVisibility = function (visible = true) {
    Object.values(printableMeshes).forEach(mesh => {
        // si aucune texture n’est posée, on met le preview; sinon on garde tel quel mais on peut cacher le contour
        if (!mesh.material?.map) {
            if (visible) {
                if (!mesh.userData.previewMaterial) mesh.userData.previewMaterial = makePreviewMaterial();
                mesh.material = mesh.userData.previewMaterial;
            } else {
                // Matériau invisible mais laisse le mesh intact (on pourrait aussi .visible=false)
                mesh.material.visible = false;
            }
        }
        setEdgesVisible(mesh, visible);
    });
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
