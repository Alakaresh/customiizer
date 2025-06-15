// 📁 canvasManager.js

let canvas = null;
let template = null;

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
		console.log('[🧩 SELECTED] Nouvelle variante sélectionnée :', selectedVariant);

		console.log("[🧠 DEBUG TEMPLATE]", {
			width: template.template_width,
			height: template.template_height,
			print_left: template.print_area_left,
			print_top: template.print_area_top,
			print_width: template.print_area_width,
			print_height: template.print_area_height,
			image_url: template.image_url
		});


		// 🔍 Conteneur principal
		const container = document.getElementById(containerId);
		if (!container) {
			console.error("[CanvasManager] ❌ Conteneur introuvable :", containerId);
			return;
		}

		// 🧹 Nettoyage du conteneur
		container.innerHTML = "";

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

			canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
			console.log(`✅ Image de fond scaleX=${scaleX}, scaleY=${scaleY}`);
		}, { crossOrigin: 'anonymous' });



		// 🔲 Zone imprimable
		const printArea = new fabric.Rect({
			left: template.print_area_left,
			top: template.print_area_top,
			width: template.print_area_width,
			height: template.print_area_height,
			fill: 'rgba(0,0,0,0)',
			stroke: 'red',
			strokeDashArray: [5, 5],
			selectable: false,
			evented: false,
			visible: false,
		});
		canvas.add(printArea);
		canvas.sendToBack(printArea);

		// 🔁 Resize automatique au conteneur
		CanvasManager.resizeToContainer(containerId);
		window.addEventListener('resize', () => {
			CanvasManager.resizeToContainer(containerId);
		});

		// 🔁 Sync 3D à chaque modif
		canvas.on('object:modified', CanvasManager.syncTo3D);
	},


	addImage: function (url) {
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
				lockRotation: true,
				lockUniScaling: true, // 🔒 Empêche la déformation (garde les proportions)
				rotatingPoint: false,
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
				mtr: false  // rotation désactivée
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
			canvas.renderAll();

			setTimeout(() => {
				canvas.setActiveObject(img);
				canvas.renderAll();
			}, 0);

               CanvasManager.syncTo3D();


               }, { crossOrigin: 'anonymous' });
       },

       alignImage: function (position) {
               const img = canvas.getActiveObject();
               if (!img) return;

               const areaLeft = template.print_area_left;
               const areaTop = template.print_area_top;
               const areaWidth = template.print_area_width;
               const areaHeight = template.print_area_height;
               const imgWidth = img.width * img.scaleX;
               const imgHeight = img.height * img.scaleY;

               if (position === 'left') {
                       img.set({ left: areaLeft });
               } else if (position === 'right') {
                       img.set({ left: areaLeft + areaWidth - imgWidth });
               } else if (position === 'center') {
                       img.set({ left: areaLeft + (areaWidth - imgWidth) / 2 });
               } else if (position === 'top') {
                       img.set({ top: areaTop });
               } else if (position === 'bottom') {
                       img.set({ top: areaTop + areaHeight - imgHeight });
               } else if (position === 'middle') {
                       img.set({ top: areaTop + (areaHeight - imgHeight) / 2 });
               }

               img.setCoords();
               canvas.renderAll();
               CanvasManager.syncTo3D();
       },

       removeImage: function () {
               const active = canvas.getActiveObject();
               if (active && active.type === 'image') {
                       canvas.remove(active);
               } else {
                       canvas.getObjects('image').forEach(obj => canvas.remove(obj));
               }
               canvas.renderAll();
               CanvasManager.syncTo3D();
       },

	syncTo3D: function () {
               const imageObject = canvas.getObjects().find(obj => obj.type === 'image');
               if (!imageObject) {
                       console.warn("[Canvas] ❌ Aucune image utilisateur trouvée.");
                       if (window.clear3DTexture) {
                               window.clear3DTexture();
                       }
                       return;
               }

		const outputCanvas = document.createElement('canvas');
		outputCanvas.width = template.print_area_width;
		outputCanvas.height = template.print_area_height;
		const ctx = outputCanvas.getContext('2d');
		ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);

		const drawX = imageObject.left - template.print_area_left;
		const drawY = imageObject.top - template.print_area_top;
		const drawWidth = imageObject.width * imageObject.scaleX;
		const drawHeight = imageObject.height * imageObject.scaleY;

		ctx.save();
		if (imageObject.angle) {
			ctx.translate(drawX + drawWidth / 2, drawY + drawHeight / 2);
			ctx.rotate((imageObject.angle * Math.PI) / 180);
			ctx.translate(-drawWidth / 2, -drawHeight / 2);
			ctx.drawImage(imageObject._element, 0, 0, drawWidth, drawHeight);
		} else {
			ctx.drawImage(imageObject._element, drawX, drawY, drawWidth, drawHeight);
		}
		ctx.restore();

		if (window.update3DTextureFromCanvas) {
			window.update3DTextureFromCanvas(outputCanvas);
		}
	},
       getExportDataForPrintful: function () {
               const images = canvas.getObjects('image');
               if (!images.length) {
                       console.warn("[CanvasManager] ❌ Aucune image trouvée.");
                       return null;
               }

               const outputCanvas = document.createElement('canvas');
               outputCanvas.width = template.print_area_width;
               outputCanvas.height = template.print_area_height;
               const ctx = outputCanvas.getContext('2d');
               ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);

               let minX = template.print_area_width;
               let minY = template.print_area_height;
               let maxX = 0;
               let maxY = 0;

               images.forEach(imgObj => {
                       if (!imgObj._element) return;
                       const scaleX = imgObj.scaleX;
                       const scaleY = imgObj.scaleY;
                       const imgDisplayWidth = imgObj.width * scaleX;
                       const imgDisplayHeight = imgObj.height * scaleY;

                       const offsetX = imgObj.left - template.print_area_left;
                       const offsetY = imgObj.top - template.print_area_top;

                       const cropX = Math.max(0, -offsetX);
                       const cropY = Math.max(0, -offsetY);

                       const visibleWidth = Math.min(imgDisplayWidth - cropX, template.print_area_width - Math.max(0, offsetX));
                       const visibleHeight = Math.min(imgDisplayHeight - cropY, template.print_area_height - Math.max(0, offsetY));
                       if (visibleWidth <= 0 || visibleHeight <= 0) return;

                       const destX = Math.max(0, offsetX);
                       const destY = Math.max(0, offsetY);

                       const sourceX = cropX / scaleX;
                       const sourceY = cropY / scaleY;
                       const sourceW = visibleWidth / scaleX;
                       const sourceH = visibleHeight / scaleY;

                       ctx.drawImage(
                               imgObj._element,
                               sourceX, sourceY, sourceW, sourceH,
                               destX, destY, visibleWidth, visibleHeight
                       );

                       minX = Math.min(minX, destX);
                       minY = Math.min(minY, destY);
                       maxX = Math.max(maxX, destX + visibleWidth);
                       maxY = Math.max(maxY, destY + visibleHeight);
               });

               if (maxX <= minX || maxY <= minY) {
                       console.warn("[CanvasManager] 🚫 Images totalement hors zone imprimable");
                       return null;
               }

               const dpiX = template.print_area_width / (selectedVariant?.print_area_width || 1);
               const dpiY = template.print_area_height / (selectedVariant?.print_area_height || 1);

               const placement = {
                       left: Math.round((minX / dpiX) * 100) / 100,
                       top: Math.round((minY / dpiY) * 100) / 100,
                       width: Math.round(((maxX - minX) / dpiX) * 100) / 100,
                       height: Math.round(((maxY - minY) / dpiY) * 100) / 100
               };

               return {
                       imageDataUrl: outputCanvas.toDataURL('image/png'),
                       placement
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
		ctx.drawImage(
			canvas.lowerCanvasEl,
			print_area_left,
			print_area_top,
			print_area_width,
			print_area_height,
			0, 0,
			print_area_width,
			print_area_height
		);

		return outputCanvas.toDataURL("image/png");
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
			wrapper.style.width = `${canvasW}px`;
			wrapper.style.height = `${canvasH}px`;
			wrapper.style.margin = "0 auto";
			wrapper.style.display = "flex";
			wrapper.style.justifyContent = "center";
			wrapper.style.alignItems = "center";
		}

		canvas.renderAll();
	}
};