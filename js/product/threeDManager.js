// 📁 threeDManager.js — rebuild minimal (même logique que viewer)

let scene, camera, renderer, controls;
let resizeObserver3D = null;
let modelRoot = null;
let printableMeshes = {}; // { name -> THREE.Mesh }

const productScales = { mug:[1.2,1.2,1.2], tumbler:[1.5,1.5,1.5], bottle:[2,2,2] };
function getScaleForProduct(modelUrl){ const u=(modelUrl||'').toLowerCase(); for(const k in productScales) if(u.includes(k)) return productScales[k]; return [1,1,1]; }

function renderOnce(){ if(renderer && scene && camera) renderer.render(scene,camera); }

function fitCameraToObject(camera, object, controls, renderer, offset=2){
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x,size.y,size.z);
  const fov = camera.fov*Math.PI/180;
  const aspect = renderer.domElement.clientWidth/Math.max(1,renderer.domElement.clientHeight);
  let cameraZ = Math.abs(maxDim/(2*Math.tan(fov/2)));
  if(aspect<1) cameraZ/=aspect;
  cameraZ*=offset;
  camera.position.set(center.x,center.y,cameraZ);
  camera.lookAt(center);
  if(controls){ controls.target.copy(center); controls.update(); }
  renderOnce();
}

function getPrintableMesh(zoneName){
  if(zoneName){
    const key = Object.keys(printableMeshes).find(n=>n.toLowerCase()===zoneName.toLowerCase());
    return key ? printableMeshes[key] : null;
  }
  const keys = Object.keys(printableMeshes);
  const pref = keys.find(n=>n.toLowerCase().includes('impression'));
  return pref ? printableMeshes[pref] : (keys.length? printableMeshes[keys[0]] : null);
}

// ================== INIT (HDR par défaut + même renderer que viewer) ==================
function init3DScene(containerId, modelUrl, canvasId='threeDCanvas', opts={}){
  const container = document.getElementById(containerId);
  const canvas    = document.getElementById(canvasId);
  if(!container || !canvas){ setTimeout(()=>init3DScene(containerId,modelUrl,canvasId,opts), 120); return; }

  scene = new THREE.Scene();

  const rect = container.getBoundingClientRect();
  const width  = Math.max(1, rect.width);
  const height = Math.max(1, rect.height || rect.width);

  camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000);
  camera.position.set(0,0,0.7);

  renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true, preserveDrawingBuffer:true });
  if('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace; else renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height, false);

  // HDR par défaut (même que viewer)
  const defaultHdr = 'https://customiizer.blob.core.windows.net/assets/Hdr/studio_country_hall_1k.hdr';
  const useHdr = opts.hdr !== 0 && opts.hdr !== false;
  const hdrUrl = (typeof opts.hdr==='string' && opts.hdr && opts.hdr!=='1') ? opts.hdr : defaultHdr;
  const hdrIntensity = Number.isFinite(opts.hdrIntensity) ? opts.hdrIntensity : 1.0;

  if(useHdr){
    const pmrem = new THREE.PMREMGenerator(renderer);
    new THREE.RGBELoader().load(
      hdrUrl,
      (hdr)=>{
        const env = pmrem.fromEquirectangular(hdr).texture;
        scene.environment = env;
        scene.background  = null;
        renderer.toneMappingExposure = 1.2 * hdrIntensity;
        hdr.dispose?.(); pmrem.dispose();
        renderOnce();
        console.log('✅ HDR chargé:', hdrUrl);
      },
      undefined,
      (err)=>{
        console.warn('⚠️ Échec HDR → fallback lights', err);
        const key  = new THREE.DirectionalLight(0xffffff,1); key.position.set(5,6,4);
        const fill = new THREE.AmbientLight(0xffffff,0.25);
        scene.add(key, fill); renderOnce();
      }
    );
  } else {
    const key  = new THREE.DirectionalLight(0xffffff,1); key.position.set(5,6,4);
    const fill = new THREE.AmbientLight(0xffffff,0.25);
    scene.add(key, fill);
  }

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enableZoom = false;

  if(resizeObserver3D) resizeObserver3D.disconnect();
  resizeObserver3D = new ResizeObserver(({0:{contentRect}})=>{
    const w=Math.max(1,contentRect.width), h=Math.max(1,contentRect.height);
    renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); renderOnce();
  });
  resizeObserver3D.observe(container);

  loadModel(modelUrl);
  animate();
}

// ================== LOAD MODEL (détection par NOM contient "impression") ==================
function loadModel(modelUrl){
  const loader = new THREE.GLTFLoader();
  loader.load(
    modelUrl,
    (gltf)=>{
      modelRoot = gltf.scene;
      printableMeshes = {};

      modelRoot.traverse((child)=>{
        if(!child.isMesh) return;
        const lname = (child.name || '').toLowerCase();
        const isPrintable = lname.includes('impression'); // règle voulue
        if(isPrintable){
          // désolidariser le matériau + sauvegarde pour reset
          child.material = child.material.clone();
          child.userData.baseMaterial = child.material.clone();
          printableMeshes[child.name] = child;
        }
      });

      const s = getScaleForProduct(modelUrl);
      modelRoot.scale.set(s[0], s[1], s[2]);
      scene.add(modelRoot);
      fitCameraToObject(camera, modelRoot, controls, renderer);

      console.log('[3D] ✅ Modèle chargé. Zones imprimables :', Object.keys(printableMeshes));
    },
    undefined,
    (err)=>console.error('[3D] ❌ Erreur GLB:', err)
  );
}

// ================== APPLY TEXTURE (pipeline IDENTIQUE au viewer) ==================
window.update3DTextureFromCanvas = async function(canvas, zoneName=null){
  const mesh = getPrintableMesh(zoneName);
  if(!mesh || !canvas){ console.warn('[3D] zone/canvas manquant'); return; }

  // ⚠️ même pipeline que viewer: on charge via TextureLoader depuis un dataURL
  const url = canvas.toDataURL('image/png'); // ou 'image/webp'
  const texLoader = new THREE.TextureLoader();
  texLoader.setCrossOrigin('anonymous');

  try{
    const tex = await texLoader.loadAsync(url);
    tex.flipY = false;
    if('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace; else tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 1;
    tex.needsUpdate = true;

    const mat = mesh.material.clone();
    mat.map = tex;
    mat.color.set(0xffffff); // pas de teinte sur l’image
    // ❌ pas de transparent/depthWrite/alphaTest bidouillés
    mat.needsUpdate = true;

    mesh.material = mat;
    renderOnce();
    console.log('🖼️ Texture appliquée (viewer-like) sur', mesh.name);
  }catch(e){
    console.error('[3D] ❌ Échec chargement texture depuis canvas:', e);
  }
};

// ================== CLEAR TEXTURE (reset 100% identique) ==================
window.clear3DTexture = function(zoneName=null){
  const mesh = getPrintableMesh(zoneName);
  if(!mesh) return;
  const base = mesh.userData.baseMaterial;
  if(base){
    mesh.material = base.clone();
    mesh.material.needsUpdate = true;
    renderOnce();
    console.log('🧹 Texture retirée, matériau restauré sur', mesh.name);
  }
};

// ================== LOOP ==================
function animate(){
  requestAnimationFrame(animate);
  if(controls) controls.update();
  if(renderer && scene && camera) renderer.render(scene, camera);
}

// ================== API ==================
window.init3DScene = init3DScene;
window.getPrintableMesh = getPrintableMesh;
