// 📁 threeDManager.js

let scene, camera, renderer, controls;
let printableMeshes = {};
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

function parseColorToHex(color) {
        if (!color) return 0xfafafa;

        if (typeof color === 'string') {
                color = color.trim().toLowerCase();

                if (color === '#000000' || color === '000000') return 0x000000;

                const map = {
                        black: 0x000000,
                        noir: 0x383838,
                        white: 0xffffff,
                        blanc: 0xffffff,
                        grey: 0x808080,
                        gray: 0x808080,
                        gris: 0x808080
                };

                if (color.startsWith('#')) {
                        const hex = parseInt(color.slice(1), 16);
                        if (!isNaN(hex)) return hex === 0x000000 ? 0x000000 : hex;

                }

                if (map[color]) return map[color];

                try {
                        const c = new THREE.Color(color);
                        return c.getHex();
                } catch (e) {
                        return 0xfafafa;
                }
        }

        return 0xfafafa;
}

function init3DScene(containerId, modelUrl, productColor = null, canvasId = 'threeDCanvas', restrictVertical = true) {
        const container = document.getElementById(containerId);
        show3DLoader(container);
        const rect = container.getBoundingClientRect();
        let width = rect.width;
        let height = rect.height;
        if (!height) {
                height = width;
        }
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
               lookAtY = 0; // recentre verticalement
       } else if (modelName.includes("waterbottle")) {
               camY = 0;
               camZ = 0.7;
               lookAtY = -0.1; // recentre verticalement
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
                canvas: document.getElementById(canvasId),
                alpha: true,
                antialias: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height, false);
        renderer.outputEncoding = THREE.LinearEncoding;

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
        if (restrictVertical) {
                controls.minPolarAngle = Math.PI / 2;
                controls.maxPolarAngle = Math.PI / 2;
        }
        // ensure orbit controls keep the chosen vertical offset
        controls.target.set(0, lookAtY, 0);
        controls.update();

	// supprime ou commente ça
	// scene.add(new THREE.AmbientLight(0xffffff, 0.4));
	// const light = new THREE.DirectionalLight(0xffffff, 0.8);
	// light.position.set(3, 5, 3);
	// scene.add(light);
	
	// ✅ nouveau setup basé sur ton JSON
	const lightsConfig = [
	  {"type":"ambient","intensity":0.40,"color":0xffffff},
	  {"type":"directional","intensity":2.40,"color":0xffffff,"position":[5,6,6]},
	  {"type":"directional","intensity":1.50,"color":0xffffff,"position":[-5,3,3]},
	  {"type":"directional","intensity":1.50,"color":0xffffff,"position":[-6,6,-5]},
	  {"type":"directional","intensity":0.80,"color":0xffffff,"position":[0,8,0]},
	  {"type":"hemi","intensity":0.60,"sky":0xffffff,"ground":0x666666}
	];
	
	lightsConfig.forEach(cfg => {
	    let light;
	    if (cfg.type === "ambient") {
	        light = new THREE.AmbientLight(cfg.color, cfg.intensity);
	    } else if (cfg.type === "directional") {
	        light = new THREE.DirectionalLight(cfg.color, cfg.intensity);
	        light.position.set(...cfg.position);
	    } else if (cfg.type === "hemi") {
	        light = new THREE.HemisphereLight(cfg.sky, cfg.ground, cfg.intensity);
	    }
	    if (light) scene.add(light);
	});

        loadModel(modelUrl, productColor);
        animate();
}



function loadModel(modelUrl, productColor = null) {
        const handleModel = (gltf) => {
                printableMeshes = {};

                const baseColorHex = parseColorToHex(productColor);

               const glbElements = [];
               gltf.scene.traverse((child) => {
                        if (!child.isMesh) return;

                        glbElements.push(child.name);
                        // child.geometry.computeVertexNormals();  // ❌ à désactiver si le modèle a déjà ses normales


                        const name = child.name.toLowerCase();

                        // 🎯 Zones d’impression personnalisables
                        if (name.startsWith("impression")) {
                               // child.material = new THREE.MeshStandardMaterial({
                               //        color: baseColorHex,
                               //        roughness: 0.3,
                               //        metalness: 0.1,
                               //        transparent: true
                               // });
                               // child.material.userData.baseColor = baseColorHex;
                               printableMeshes[child.name] = child;
                        }

                        // 🎨 WaterBottle : couleur personnalisée + métal gris
                        else if (name === "waterbottle") {
                                // child.material = new THREE.MeshStandardMaterial({
                                //        color: baseColorHex,
                                //        roughness: 0.3,
                                //        metalness: 0.1
                                // });
                        } else if (name === "waterbottlecap" || name === "waterbottlebottom") {
                                // child.material = new THREE.MeshStandardMaterial({
                                //        color: 0xaaaaaa,
                                //        roughness: 0.2,
                                //        metalness: 0.7
                                // });
                        }

                        // 🧊 Tumbler : couleur personnalisée + métal gris
                        else if (name === "tumbler") {
                                // child.material = new THREE.MeshStandardMaterial({
                                //        color: baseColorHex,
                                //        roughness: 0.3,
                                //        metalness: 0.1
                                // });
                        } else if (name === "tumblercap" || name === "tumblerbottom") {
                                // child.material = new THREE.MeshStandardMaterial({
                                //        color: 0xaaaaaa,
                                //        roughness: 0.2,
                                //        metalness: 0.7
                                // });
                        }

                        // 🎭 Sinon, matériau par défaut
                        else {
                                // child.material = new THREE.MeshStandardMaterial({
                                //        color: baseColorHex,
                                //        roughness: 0.3,
                                //        metalness: 0.1
                                // });
                        }

                        // child.material.needsUpdate = true;
               });

               console.log('[3D Debug] GLB elements:', glbElements);
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
		console.log("update3DTextureFromCanvas appelé")
        mesh.material.map = texture;
        mesh.material.color.setHex(0xffffff);
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
        img.onerror = function () {
                console.warn('[3D] ❌ Échec du chargement de la texture :', url);
        };
        img.src = url;
};

// Permet de supprimer la texture appliquée sur le modèle 3D
window.clear3DTexture = function (zoneName = null) {
        let mesh = null;
        if (zoneName) {
                mesh = printableMeshes[zoneName];
        } else {
                const keys = Object.keys(printableMeshes);
                if (keys.length > 0) {
                        mesh = printableMeshes[keys[0]];
                }
        }

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

window.logPrintableMeshPosition = function (zoneName = null) {
        let mesh = null;
        if (zoneName) {
                mesh = printableMeshes[zoneName];
        } else {
                const keys = Object.keys(printableMeshes);
                if (keys.length > 0) {
                        mesh = printableMeshes[keys[0]];
                }
        }

        if (!mesh) {
                console.warn('[3D Debug] Zone imprimable non trouvée pour :', zoneName);
                return;
        }

        mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox;
};
