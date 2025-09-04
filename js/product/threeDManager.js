// 📁 threeDManager.js

let scene, camera, renderer, controls;

function init3DScene(containerId, modelUrl, canvasId = 'threeDCanvas') {
    const container = document.getElementById(containerId);
    const rect = container.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height || width;

    // 🎬 Scène
    scene = new THREE.Scene();

    // 🎥 Caméra
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 1); // recule la caméra
    scene.add(camera);

    // 🔦 Lumière simple
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(3, 3, 3);
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

    // 🎮 Contrôles orbitaux
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 📦 Chargement du modèle
    const loader = new THREE.GLTFLoader();
    loader.load(modelUrl, (gltf) => {
        scene.add(gltf.scene);
        console.log("[3D] Modèle chargé :", modelUrl);
    }, undefined, (error) => {
        console.error("[3D] Erreur chargement modèle :", error);
    });

    // ▶️ Lancement de la boucle
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
