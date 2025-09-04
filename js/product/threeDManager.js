// 📁 threeDManager.js

let scene, camera, renderer, controls;
let resizeObserver3D = null;

function init3DScene(containerId, modelUrl, canvasId = 'threeDCanvas') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("[3D] ❌ Conteneur introuvable :", containerId);
        return;
    }

    const rect = container.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height || width;

    // 🎬 Scène
    scene = new THREE.Scene();

    // 🎥 Caméra
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0.7); // recul simple
    camera.lookAt(0, 0, 0);

    // 🔦 Lumières basiques
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(3, 5, 3);
    scene.add(dirLight);

    // 🖼️ Rendu
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById(canvasId),
        alpha: true,
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.outputEncoding = THREE.sRGBEncoding;

    // 📏 Resize auto
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

    // 🎮 Contrôles orbitaux
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 📦 Chargement du modèle
    const loader = new THREE.GLTFLoader();
    loader.load(modelUrl, (gltf) => {
        scene.add(gltf.scene);
        console.log("[3D] ✅ Modèle chargé :", modelUrl);
    }, undefined, (error) => {
        console.error("[3D] ❌ Erreur chargement modèle :", error);
    });

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}
