// 📁 threeDManager.js

let scene, camera, renderer, controls;
let printableMeshes = {};

function init3DScene(containerId, modelUrl) {
	const container = document.getElementById(containerId);
	const width = container.clientWidth;
	const height = container.clientHeight;
	const modelName = modelUrl.split('/').pop().toLowerCase();

	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

	// Position par défaut
	let camY = 0;
	let camZ = 0.5;
	let lookAtY = 0;

	// Ajustements spécifiques
	if (modelName.includes("tumbler")) {
		camY = 0;
		camZ = 0.7;
		lookAtY = 2;
	} else if (modelName.includes("waterbottle")) {
		camY = 0;
		camZ = 0.7;
		lookAtY = -20;
	} else if (modelName.includes("mug15oz")) {
		camY = 0;
		camZ = 0.5;
		lookAtY = 0;
	} else if (modelName.includes("mug20oz")) {
		camY = 0;
		camZ = 0.5;
		lookAtY = 0;
	} else {
		// mug11oz ou fallback
		camY = 0.0;
		camZ = 0.5;
		lookAtY = 0;
	}

	camera.position.set(0, camY, camZ);
	camera.lookAt(0, lookAtY, 0); // 👁️ fait pointer la caméra plus bas

	// Rendu
	renderer = new THREE.WebGLRenderer({
		canvas: document.getElementById("threeDCanvas"),
		alpha: true,
		antialias: true
	});
	renderer.setSize(width, height);
	renderer.outputEncoding = THREE.sRGBEncoding;

	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.enableZoom = false;
	controls.enablePan = false;

	scene.add(new THREE.AmbientLight(0xffffff, 0.4));
	const light = new THREE.DirectionalLight(0xffffff, 0.8);
	light.position.set(3, 5, 3);
	scene.add(light);

        loadModel(modelUrl);
        animate();
}



function loadModel(modelUrl) {
        const handleModel = (gltf) => {
                printableMeshes = {};

		gltf.scene.traverse((child) => {
			if (!child.isMesh) return;

			child.geometry.computeVertexNormals();

			const name = child.name.toLowerCase();

			// 🎯 Zones d’impression personnalisables
			if (name.startsWith("impression")) {
				child.material = new THREE.MeshStandardMaterial({
					color: 0xfafafa,
					roughness: 0.3,
					metalness: 0.1,
					transparent: true
				});
				printableMeshes[child.name] = child;
			}

			// 🎨 WaterBottle : blanc + métal gris
			else if (name === "waterbottle") {
				child.material = new THREE.MeshStandardMaterial({
					color: 0xfafafa,
					roughness: 0.3,
					metalness: 0.1
				});
			} else if (name === "waterbottlecap" || name === "waterbottlebottom") {
				child.material = new THREE.MeshStandardMaterial({
					color: 0xaaaaaa,
					roughness: 0.2,
					metalness: 0.7
				});
			}

			// 🧊 Tumbler : blanc + métal gris
			else if (name === "tumbler") {
				child.material = new THREE.MeshStandardMaterial({
					color: 0xfafafa,
					roughness: 0.3,
					metalness: 0.1
				});
			} else if (name === "tumblercap" || name === "tumblerbottom") {
				child.material = new THREE.MeshStandardMaterial({
					color: 0xaaaaaa,
					roughness: 0.2,
					metalness: 0.7
				});
			}

			// 🎭 Sinon, matériau par défaut
			else {
				child.material = new THREE.MeshStandardMaterial({
					color: 0xfafafa,
					roughness: 0.3,
					metalness: 0.1
				});
			}

			child.material.needsUpdate = true;
		});

                scene.add(gltf.scene);
                console.log("[3D] ✅ Zones imprimables :", Object.keys(printableMeshes));
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
        });
}


function animate() {
	requestAnimationFrame(animate);
	controls.update();
	renderer.render(scene, camera);
}
function getPrintableMeshes(scene) {
	const result = {};
	scene.traverse((child) => {
		if (child.isMesh && child.name.startsWith("impression")) {
			result[child.name] = child;
		}
	});
	return result;
}

// Exposé global
window.update3DTextureFromCanvas = function (canvas, zoneName = null) {
	const texture = new THREE.CanvasTexture(canvas);
	texture.encoding = THREE.sRGBEncoding;
	texture.needsUpdate = true;

	// 🔍 Si on a un nom précis
	let mesh = null;
	if (zoneName) {
		mesh = printableMeshes[zoneName];
	} else {
		// Sinon, on en prend un arbitraire (le premier)
		const keys = Object.keys(printableMeshes);
		if (keys.length > 0) {
			mesh = printableMeshes[keys[0]];
		}
	}

	if (!mesh) {
		console.warn("[3D] ❌ Zone imprimable non trouvée pour :", zoneName);
		return;
	}

	mesh.material.map = texture;
	mesh.material.needsUpdate = true;
	console.log(`[3D] ✅ Texture appliquée à '${mesh.name}'`);
};
