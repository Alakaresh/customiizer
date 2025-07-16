// 📁 canvasManager.js

let canvas = null;
let template = null;
let resizeObserver = null;
let productOverlay = null;
let guideGroup = null;

const CanvasManager = {
	init: function (templateData, containerId) {
		template = templateData;

		// 🔢 Sécuriser les valeurs numériques
		template.print_area_left = parseFloat(template.print_area_left);
		template.print_area_top = parseFloat(template.print_area_top);
		template.print_area_width = parseFloat(template.print_area_width);
		template.print_area_height = parseFloat(template.print_area_height);
		template.template_width = parseFloat(template.template_width);
		template.template_height = parseFloat(template.template_height);

		// 🔍 Conteneur principal
                const container = document.getElementById(containerId);
                if (!container) {
                        console.error("[CanvasManager] ❌ Conteneur introuvable :", containerId);
                        return;
                }

                if (resizeObserver) {
                        resizeObserver.disconnect();
                }
                resizeObserver = new ResizeObserver(() => {
                        CanvasManager.resizeToContainer(containerId);
                });
                resizeObserver.observe(container);

                // 🧹 Nettoyage du conteneur sans retirer le bouton "Ajouter une image"
                const existingWrapper = container.querySelector('#productCanvasWrapper');
                if (existingWrapper) {
                        existingWrapper.remove();
                }

		// 🧱 Créer wrapper + canvas
		const wrapper = document.createElement("div");
		wrapper.className = "fabric-wrapper";
		wrapper.id = "productCanvasWrapper";

		const canvasEl = document.createElement("canvas");
		canvasEl.id = "productCanvas";
		canvasEl.width = template.template_width;
		canvasEl.height = template.template_height;

		wrapper.appendChild(canvasEl);
		container.appendChild(wrapper);

		// 🖌️ Initialisation Fabric
		canvas = new fabric.Canvas(canvasEl, {
			preserveObjectStacking: true,
			selection: false
		});

		// 📷 Image de fond (template Printful)
		fabric.Image.fromURL(template.image_url, function (img) {
			const scaleX = template.template_width / img.width;
			const scaleY = template.template_height / img.height;

			img.set({
				originX: 'left',
				originY: 'top',
				scaleX: scaleX,
				scaleY: scaleY,
				left: 0,
				top: 0,
				selectable: false,
				evented: false
			});

			productOverlay = img;
                        canvas.add(productOverlay);
                        canvas.bringToFront(productOverlay);
		}, { crossOrigin: 'anonymous' });

                // 🔁 Resize automatique au conteneur
		CanvasManager.resizeToContainer(containerId);
		window.addEventListener('resize', () => {
			CanvasManager.resizeToContainer(containerId);
		});

                // 🔁 Sync 3D à chaque changement sur le canvas
                canvas.on('object:modified', CanvasManager.syncTo3D);
                canvas.on('object:added', CanvasManager.syncTo3D);
                canvas.on('object:removed', CanvasManager.syncTo3D);
        },


       addImage: function (url, callback) {
               fabric.Image.fromURL(url, function (img) {
			const drawX = template.print_area_left;
			const drawY = template.print_area_top;

			const scale = Math.min(
				template.print_area_width / img.width,
				template.print_area_height / img.height
			);

			img.set({
				left: drawX,
				top: drawY,
				scaleX: scale,
				scaleY: scale,
				originX: 'left',
				originY: 'top',
                                selectable: true,
                                hasControls: true,
                                lockRotation: false,
                                lockUniScaling: true, // 🔒 Empêche la déformation (garde les proportions)
                                hasRotatingPoint: true,
				//borderColor: 'green',
				//cornerColor: 'blue'
			});

			img.setControlsVisibility({
				tl: true,  // coin haut gauche
				tr: true,  // coin haut droit
				bl: true,  // coin bas gauche
				br: true,  // coin bas droit
				mt: false,
				mb: false,
                                ml: false,
                                mr: false,
                                mtr: true  // rotation activée
			});


			img.clipPath = new fabric.Rect({
				left: template.print_area_left,
				top: template.print_area_top,
				width: template.print_area_width,
				height: template.print_area_height,
				originX: 'left',
				originY: 'top',
				absolutePositioned: true
			});

                       canvas.add(img);
                       img.setCoords();
                       canvas.bringToFront(productOverlay);
                       canvas.bringToFront(guideGroup);
                       canvas.renderAll();

                       setTimeout(() => {
                               canvas.setActiveObject(img);
                               canvas.renderAll();
                               if (typeof callback === 'function') {
                                       callback();
                               }
                               CanvasManager.syncTo3D();
                       }, 0);


               }, { crossOrigin: 'anonymous' });
       },

        alignImage: function (position) {
                const img = canvas.getActiveObject();
                if (!img) return;

               const areaLeft = template.print_area_left;
               const areaTop = template.print_area_top;
               const areaWidth = template.print_area_width;
               const areaHeight = template.print_area_height;

               const bounds = img.getBoundingRect(true);
               const offsetX = img.left - bounds.left;
               const offsetY = img.top - bounds.top;

               if (position === 'left') {
                       img.set({ left: areaLeft + offsetX });
               } else if (position === 'right') {
                       img.set({ left: areaLeft + areaWidth - bounds.width + offsetX });
               } else if (position === 'center') {
                       img.set({ left: areaLeft + (areaWidth - bounds.width) / 2 + offsetX });
               } else if (position === 'top') {
                       img.set({ top: areaTop + offsetY });
               } else if (position === 'bottom') {
                       img.set({ top: areaTop + areaHeight - bounds.height + offsetY });
               } else if (position === 'middle') {
                       img.set({ top: areaTop + (areaHeight - bounds.height) / 2 + offsetY });
               }

                img.setCoords();
                canvas.renderAll();
                CanvasManager.syncTo3D();
        },

        bringImageForward: function () {
                const obj = canvas.getActiveObject();
                if (!obj) return;
                canvas.bringForward(obj);
                canvas.bringToFront(productOverlay);
                canvas.bringToFront(guideGroup);
                canvas.renderAll();
                CanvasManager.syncTo3D();
        },

        sendImageBackward: function () {
                const obj = canvas.getActiveObject();
                if (!obj) return;
                canvas.sendBackwards(obj);
                canvas.bringToFront(productOverlay);
                canvas.bringToFront(guideGroup);
                canvas.renderAll();
                CanvasManager.syncTo3D();
        },

        rotateImage: function(angle) {
                const img = canvas.getActiveObject();
                if (!img) return;
                const current = img.angle || 0;
                let target = current + angle;
                target = Math.round(target / 90) * 90;
                img.rotate(target);
                img.setCoords();
                canvas.renderAll();
                CanvasManager.syncTo3D();
        },

        mirrorImage: function () {
                const img = canvas.getActiveObject();
                if (!img) return;
                img.flipX = !img.flipX;
                img.setCoords();
                canvas.renderAll();
                CanvasManager.syncTo3D();
        },

       removeImage: function () {
               const img = canvas.getObjects().find(obj => obj.type === 'image');
               if (!img) return;
               canvas.remove(img);
               canvas.renderAll();
               CanvasManager.syncTo3D();
       },

       hasImage: function () {
               if (!canvas) return false;
               return canvas.getObjects().some(obj => obj.type === 'image');
       },

       syncTo3D: function () {
               const imgDataUrl = CanvasManager.exportPrintAreaPNG();

               if (!imgDataUrl) {
                       console.warn("[Canvas] ❌ Aucune donnée exportable.");
                       if (window.clear3DTexture) {
                               window.clear3DTexture();
                       }
                       return;
               }

               const offscreen = document.createElement('canvas');
               offscreen.width = template.print_area_width;
               offscreen.height = template.print_area_height;
               const ctx = offscreen.getContext('2d');
               ctx.clearRect(0, 0, offscreen.width, offscreen.height);

               const img = new Image();
               img.onload = function () {
                       ctx.drawImage(img, 0, 0);
                       const imageObject = canvas.getObjects().find(obj => obj.type === 'image');
                       if (imageObject) {
                               const bounds = imageObject.getBoundingRect(true);
                       }
                       if (window.update3DTextureFromCanvas) {
                               window.update3DTextureFromCanvas(offscreen);
                               if (window.logPrintableMeshPosition) {
                                       window.logPrintableMeshPosition();
                               }
                       }
               };
               img.crossOrigin = 'anonymous';
               img.src = imgDataUrl;
       },
	getExportDataForPrintful: function () {
		const imageObject = canvas.getObjects().find(obj => obj.type === 'image');
		if (!imageObject || !imageObject._element) {
			console.warn("[CanvasManager] ❌ Aucune image trouvée.");
			return null;
		}

		const img = imageObject._element;
		const scaleX = imageObject.scaleX;
		const scaleY = imageObject.scaleY;

		const imgDisplayWidth = imageObject.width * scaleX;
		const imgDisplayHeight = imageObject.height * scaleY;

		// Décalage de l’image dans la zone imprimable
		const offsetX = imageObject.left - template.print_area_left;
		const offsetY = imageObject.top - template.print_area_top;

		const cropX = Math.max(0, -offsetX);
		const cropY = Math.max(0, -offsetY);

		const visibleWidth = Math.min(imgDisplayWidth - cropX, template.print_area_width - Math.max(0, offsetX));
		const visibleHeight = Math.min(imgDisplayHeight - cropY, template.print_area_height - Math.max(0, offsetY));

		if (visibleWidth <= 0 || visibleHeight <= 0) {
			console.warn("[CanvasManager] 🚫 Image totalement hors zone imprimable");
			return null;
		}

		// ✅ Création d’un canvas natif à la taille EXACTE
		const outputCanvas = document.createElement('canvas');
		outputCanvas.width = visibleWidth;
		outputCanvas.height = visibleHeight;

		const ctx = outputCanvas.getContext('2d');
		ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);

		// Source crop dans l'image originale (pré-scale)
		const sourceX = cropX / scaleX;
		const sourceY = cropY / scaleY;
		const sourceW = visibleWidth / scaleX;
		const sourceH = visibleHeight / scaleY;


		// ✅ Draw avec source + destination
		ctx.drawImage(
			img,
			sourceX, sourceY, sourceW, sourceH, // src
			0, 0, visibleWidth, visibleHeight   // dest
		);

		// ✅ Visualisation (pour toi)
		const debugDataUrl = outputCanvas.toDataURL("image/png");

		return {
			imageDataUrl: debugDataUrl,
			placement: {
				x: Math.max(0, offsetX),
				y: Math.max(0, offsetY),
				width: visibleWidth,
				height: visibleHeight
			}
		};
	}


	,

	// Fonction privée : recadre le canvas dans la print_area
        _getCroppedImageInPrintArea: function () {
                const { print_area_left, print_area_top, print_area_width, print_area_height } = template;

                const outputCanvas = document.createElement('canvas');
                outputCanvas.width = print_area_width;
                outputCanvas.height = print_area_height;

                const ctx = outputCanvas.getContext('2d');
                ctx.clearRect(0, 0, print_area_width, print_area_height);

                const zoom = canvas.getZoom();
                const ratio = canvas.getRetinaScaling ? canvas.getRetinaScaling() : 1;
                ctx.drawImage(
                        canvas.lowerCanvasEl,
                        print_area_left * zoom * ratio,
                        print_area_top * zoom * ratio,
                        print_area_width * zoom * ratio,
                        print_area_height * zoom * ratio,
                        0,
                        0,
                        print_area_width,
                        print_area_height
                );

                return outputCanvas.toDataURL('image/png');
        },

        exportPrintAreaPNG: function () {
                const savedBg = canvas.backgroundImage;
                const activeObj = canvas.getActiveObject();
                const overlayVisible = productOverlay ? productOverlay.visible : null;
                const guideVisible = guideGroup ? guideGroup.visible : null;
                if (activeObj) {
                        canvas.discardActiveObject();
                }
                if (productOverlay) productOverlay.visible = false;
                if (guideGroup) guideGroup.visible = false;
                canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));

                const { print_area_left, print_area_top, print_area_width, print_area_height } = template;
                const outputCanvas = document.createElement('canvas');
                outputCanvas.width = print_area_width;
                outputCanvas.height = print_area_height;

                const ctx = outputCanvas.getContext('2d');
                ctx.clearRect(0, 0, print_area_width, print_area_height);

                const zoom = canvas.getZoom();
                const ratio = canvas.getRetinaScaling ? canvas.getRetinaScaling() : 1;
                ctx.drawImage(
                        canvas.lowerCanvasEl,
                        print_area_left * zoom * ratio,
                        print_area_top * zoom * ratio,
                        print_area_width * zoom * ratio,
                        print_area_height * zoom * ratio,
                        0,
                        0,
                        print_area_width,
                        print_area_height
                );

                canvas.setBackgroundImage(savedBg, canvas.renderAll.bind(canvas));
                if (productOverlay) productOverlay.visible = overlayVisible;
                if (guideGroup) guideGroup.visible = guideVisible;
                if (activeObj) {
                        canvas.setActiveObject(activeObj);
                }
                canvas.requestRenderAll();

                const wrapper = document.getElementById('productCanvasWrapper');
                if (wrapper && wrapper.classList.contains('rotate-90')) {
                        const rotated = document.createElement('canvas');
                        rotated.width = outputCanvas.height;
                        rotated.height = outputCanvas.width;
                        const rCtx = rotated.getContext('2d');
                        rCtx.translate(rotated.width / 2, rotated.height / 2);
                        rCtx.rotate(Math.PI / 2);
                        rCtx.drawImage(outputCanvas, -outputCanvas.width / 2, -outputCanvas.height / 2);
                        return rotated.toDataURL('image/png');
                }

                return outputCanvas.toDataURL('image/png');
        },

	// Fonction privée : retourne position visible de l'image dans la zone imprimable
	_getPrintfulPlacement: function (imageObject) {
		const bounds = imageObject.getBoundingRect(true);

		const zoneLeft = template.print_area_left;
		const zoneTop = template.print_area_top;
		const zoneRight = zoneLeft + template.print_area_width;
		const zoneBottom = zoneTop + template.print_area_height;

		const x = Math.max(0, bounds.left - zoneLeft);
		const y = Math.max(0, bounds.top - zoneTop);
		const width = Math.max(0, Math.min(bounds.left + bounds.width, zoneRight) - Math.max(bounds.left, zoneLeft));
		const height = Math.max(0, Math.min(bounds.top + bounds.height, zoneBottom) - Math.max(bounds.top, zoneTop));

		if (width === 0 || height === 0) return null;

		return { x, y, width, height };
	},

	resizeToContainer: function (containerId) {
		const container = document.getElementById(containerId);
		if (!container || !canvas || !template) return;

		const containerW = container.clientWidth;
		const containerH = container.clientHeight;

		const tplW = template.template_width;
		const tplH = template.template_height;
		const tplRatio = tplW / tplH;

		let zoom = Math.min(containerW / tplW, containerH / tplH);
		const canvasW = tplW * zoom;
		const canvasH = tplH * zoom;

		canvas.setZoom(zoom);
		canvas.setWidth(canvasW);
		canvas.setHeight(canvasH);

		// ✅ wrapper dimensions réelles
                const wrapper = document.getElementById("productCanvasWrapper");
                if (wrapper) {
                        let w = canvasW;
                        let h = canvasH;
                        if (wrapper.classList.contains('rotate-90')) {
                                w = canvasH;
                                h = canvasW;
                        }
                        wrapper.style.width = `${w}px`;
                        wrapper.style.height = `${h}px`;
                        wrapper.style.margin = "0 auto";
                        wrapper.style.display = "flex";
                        wrapper.style.justifyContent = "center";
                        wrapper.style.alignItems = "center";
                }

		canvas.renderAll();
	}
};
