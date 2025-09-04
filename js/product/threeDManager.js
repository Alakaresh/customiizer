// 📁 threeDManager.js

let scene, camera, renderer, controls;
let resizeObserver3D = null;

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
    if (loader) {
        loader.remove();
    }
}

function init3DScene(containerId, modelUrl, canvasId = 'threeDCanvas') {
        const container = document.getElementById(containerId);
        show3DLoader(container);
        const rect = container.getBoundingClientRect();
        let width = rect.width;
        let height = rect.height;
        if (!height) {
                height = width;
        }
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(0, 0, 0.5);
        camera.lookAt(0, 0, 0);

	// Rendu
        renderer = new THREE.WebGLRenderer({
                canvas: document.getElementById(canvasId),
                alpha: true,
                antialias: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height, false);
        renderer.outputEncoding = THREE.sRGBEncoding;

        if (resizeObserver3D) {
                resizeObserver3D.disconnect();
        }
        resizeObserver3D = new ResizeObserver((entries) => {
                const { width: w, height: h } = entries[0].contentRect;
                if (w > 0 && h > 0) {
                        renderer.setSize(w, h, false);
                        camera.aspect = w / h;
                        camera.updateProjectionMatrix();
                }
        });
        resizeObserver3D.observe(container);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.target.set(0, 0, 0);
        controls.update();

	scene.add(new THREE.AmbientLight(0xffffff, 0.4));
	const light = new THREE.DirectionalLight(0xffffff, 0.8);
	light.position.set(3, 5, 3);
	scene.add(light);

        loadModel(modelUrl);
        animate();
}



function loadModel(modelUrl) {
        const handleModel = (gltf) => {
                gltf.scene.traverse((child) => {
                        if (child.isMesh) {
                                child.geometry.computeVertexNormals();
                                if (child.name) {
                                        console.log('GLB element:', child.name);
                                }
                        }
                });

                scene.add(gltf.scene);
                hide3DLoader(renderer.domElement.parentElement);
        };

        if (window.customizerCache?.models?.[modelUrl]) {
                handleModel(window.customizerCache.models[modelUrl]);
                return;
        }

        const loader = new THREE.GLTFLoader();
        loader.load(modelUrl, (gltf) => {
                if (window.customizerCache) {
                        window.customizerCache.models[modelUrl] = gltf;
                }
                handleModel(gltf);
        }, undefined, (error) => {
                console.error("Erreur chargement modèle :", error);
                hide3DLoader(renderer.domElement.parentElement);
        });
}


function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
}
