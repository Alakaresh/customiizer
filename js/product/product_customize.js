function displayGeneratedImages(images) {
	const siteFilesList = jQuery('#siteFilesList');
	console.log("siteFilesList :",siteFilesList);
	console.log("images :",images);
	siteFilesList.empty();
	if (!images.length) {
		siteFilesList.append('<div class="no-images">Aucune image trouvée.</div>');
		return;
	}
	images.forEach(image => {
		siteFilesList.append(`
				<div class="site-image">
					<img src="${image.image_url}" 
						 alt="${image.prompt || 'Image générée'}" 
						 class="image-thumbnail" 
						 data-image-url="${image.image_url}">
				</div>
			`);
	});
}
function uploadBase64ToServer(base64Data, debugId) {
	const filename = `${debugId}.png`;
	console.log(`[Upload] 🔄 Envoi de l’image ${filename}`);

	const formData = new FormData();
	formData.append('action', 'save_image_from_base64');
	formData.append('image_base64', base64Data);
	formData.append('filename', filename);

	return fetch(ajaxurl, {
		method: 'POST',
		body: formData
	}).then(res => res.json());
}



jQuery(document).ready(function ($) {
	jQuery('#saveDesignButton').on('click', function () {
		console.log("[UI] 💾 Enregistrement du design (mockup)");
		
		jQuery('#customizeModal').hide();

		if (CanvasManager?.syncTo3D) {
			CanvasManager.syncTo3D();
		}

		const imageObject = canvas?.getObjects().find(obj => obj.type === 'image');
		if (!imageObject) {
			console.warn("❌ Aucune image trouvée sur le canvas.");
			return;
		}

		const bounds = imageObject.getBoundingRect(true);
		const zoneLeft = template.print_area_left;
		const zoneTop = template.print_area_top;
		const zoneRight = zoneLeft + template.print_area_width;
		const zoneBottom = zoneTop + template.print_area_height;

		const isFullyInside =
			  bounds.left >= zoneLeft &&
			  bounds.top >= zoneTop &&
			  (bounds.left + bounds.width) <= zoneRight &&
			  (bounds.top + bounds.height) <= zoneBottom;

		// Conversion des DPI
		const dpiX = template.print_area_width / selectedVariant.print_area_width;
		const dpiY = template.print_area_height / selectedVariant.print_area_height;

		let mockupData = null;

		if (isFullyInside) {
			console.log("[Mockup] ✅ Image totalement dans la zone – export simple");

			const widthPx  = imageObject.width * imageObject.scaleX;
			const heightPx = imageObject.height * imageObject.scaleY;
			const leftPx   = imageObject.left - zoneLeft;
			const topPx    = imageObject.top - zoneTop;

			mockupData = {
				image_url: imageObject._element?.src || null,
				product_id: currentProductId || null,
				variant_id: selectedVariant?.variant_id || null,
				placement: selectedVariant?.placement || selectedVariant?.zone_3d_name || null,
				technique: selectedVariant?.technique || null,
				width: Math.round((widthPx / dpiX) * 10) / 10,
				height: Math.round((heightPx / dpiY) * 10) / 10,
				left: Math.round((leftPx / dpiX) * 10) / 10,
				top: Math.round((topPx / dpiY) * 10) / 10,
				dpi_x: dpiX,
				dpi_y: dpiY
			};
			console.log('[🧩 SELECTED] Nouvelle variante sélectionnée :', selectedVariant);

			console.log("[Mockup] 🌐 Données prêtes avec image URL :", mockupData);
			generateMockup(mockupData); // ✅ Appelé une fois l'image dispo
		} else {
			console.log('[🧩 SELECTED] Nouvelle variante sélectionnée :', selectedVariant);

			console.log("[Mockup] ✂️ Image déborde – export recadré");

			const exportData = CanvasManager.getExportDataForPrintful();
			if (!exportData) {
				alert("L’image est complètement hors de la zone imprimable.");
				return;
			}

			const placement = exportData.placement;
			console.log("placement :",placement);

			// ✅ ENVOYER IMAGE RECADRÉE VERS SERVEUR (base64 → PNG + URL publique)
			uploadBase64ToServer(exportData.imageDataUrl).then(response => {
				console.log("[Debug] Réponse upload base64 :", response);
				if (!response.success) {
					alert("Erreur lors de l'envoi de l’image : " + response.message);
					return;
				}

				// ✅ L’image est maintenant sur ton serveur, URL publique :
				const publicImageUrl = response.data.image_url + '?v=' + Date.now();

				// ✅ Calculs DPI → pouces
				const mockupData = {
					image_url: publicImageUrl,
					product_id: currentProductId || null,
					variant_id: selectedVariant?.variant_id || null,
					placement: selectedVariant?.placement || selectedVariant?.zone_3d_name || null,
					technique: selectedVariant?.technique || null,
					width: Math.round((placement.width / dpiX) * 10) / 10,
					height: Math.round((placement.height / dpiY) * 10) / 10,
					left: Math.max(0, Math.round((placement.x / dpiX) * 10) / 10),  // ✅ clamp
					top: Math.max(0, Math.round((placement.y / dpiY) * 10) / 10),   // ✅ clamp
					dpi_x: dpiX,
					dpi_y: dpiY
				};


				console.log("[Mockup] 🌐 Données prêtes avec image URL :", mockupData);
				generateMockup(mockupData); // ✅ Appelé une fois l'image dispo
			});
		}

	});
});

jQuery(document).ready(function ($) {
        console.log("[JS] Initialisation du modal de personnalisation...");

        let importedFiles = [];
        let allGeneratedImages = [];

	const pcFilesList = $('#pcFilesList');
	const siteFilesList = $('#siteFilesList');
	const customizeButton = $('.design-button');
	const customizeModal = $('#customizeModal');
	const closeButtonMain = $('#customizeModal .close-button');
	const addImageButton = $('#addImageButton');
	const imageSourceModal = $('#imageSourceModal');
	const closeButtonImageModal = $('#imageSourceModal .close-button');
        const uploadPcImageButton = $('#uploadPcImageButton');
        const imageToggle = $('#imageToggle');
        const toggle3D = $('#toggle3D');
        const alignLeftButton = $('#alignLeftButton');
        const alignCenterButton = $('#alignCenterButton');
        const alignRightButton = $('#alignRightButton');
        const alignTopButton = $('#alignTopButton');
        const alignMiddleButton = $('#alignMiddleButton');
        const alignBottomButton = $('#alignBottomButton');
        const removeImageButton = $('#removeImageButton');
        const imageControls = $('.image-controls');
        const visualHeader = $('.visual-header');
        let threeDInitialized = false;

        function trapFocus(modal) {
                const focusable = modal.find('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');
                if (!focusable.length) return;
                const first = focusable.first();
                const last = focusable.last();
                modal.on('keydown.trapFocus', function (e) {
                        if (e.key === 'Tab') {
                                if (e.shiftKey) {
                                        if ($(document.activeElement).is(first)) {
                                                last.focus();
                                                e.preventDefault();
                                        }
                                } else {
                                        if ($(document.activeElement).is(last)) {
                                                first.focus();
                                                e.preventDefault();
                                        }
                                }
                        }
                });
                first.focus();
        }

        function releaseFocus(modal) {
                modal.off('keydown.trapFocus');
        }

        // 2) Ouvrir le modal de personnalisation
        customizeButton.on('click', async function () {
                threeDInitialized = false;
                fetchUserImages(); // images perso si besoin
                addImageButton.show();
                customizeModal.show();
                const productImageSrc = jQuery("#product-main-image").attr("src");
                jQuery("#footerProductImage").attr("src", productImageSrc);
                const productName = jQuery(".product-name").text().trim();
                jQuery("#customizeModalTitle").text(productName);
                jQuery(".summary-name").text(productName);
                const productPrice = jQuery(".price-value span").text().trim();
                jQuery(".summary-price").text(productPrice);
                imageControls.hide();
                visualHeader.hide();
                trapFocus(customizeModal);

                try {
                        // 1. Charger le template depuis le cache ou l'API
                        let template = window.customizerCache.templates[selectedVariant.variant_id];
                        if (!template) {
                                const res = await fetch(`/wp-json/custom-api/v1/variant-template/${selectedVariant.variant_id}`);
                                const data = await res.json();

                                if (!data.success || !data.template) {
                                        console.error("[UI] ❌ Template introuvable pour la variante", selectedVariant.variant_id);
                                        $('#product2DContainer').html('<p style="color:red;">Template non disponible</p>');
                                        return;
                                }

                                template = data.template;
                                window.customizerCache.templates[selectedVariant.variant_id] = template;
                                console.log('[Cache] Template chargé et stocké pour', selectedVariant.variant_id);
                        } else {
                                console.log('[Cache] Template récupéré depuis le cache pour', selectedVariant.variant_id);
                        }

			// 2. Lancer Fabric.js dans le container
			CanvasManager.init(template, 'product2DContainer');

                        // 3. Lancer Three.js si dispo et si l'aperçu est activé
                        if (selectedVariant.url_3d && toggle3D.is(':checked')) {
                                $('#product3DContainer').show();
                                init3DScene('product3DContainer', selectedVariant.url_3d, selectedVariant.color);
                                threeDInitialized = true;
                        } else {
                                $('#product3DContainer').hide();
                        }
		} catch (error) {
			console.error("[UI] ❌ Erreur de chargement template :", error);
		}
	});


        // 3) Fermer le modal principal
        closeButtonMain.on('click', function () {
                customizeModal.hide();
                releaseFocus(customizeModal);
                addImageButton.show();
                imageControls.hide();
                visualHeader.hide();
        });

        // Afficher le bouton lors du changement de produit
        $(document).on('productSelected', function () {
                addImageButton.show();
        });

	// 4) Ouvrir le sélecteur d’image
        addImageButton.on('click', function () {
                imageSourceModal.show();
                trapFocus(imageSourceModal);
        });

	// 5) Fermer le sélecteur d’image
        closeButtonImageModal.on('click', function () {
                imageSourceModal.hide();
                releaseFocus(imageSourceModal);
        });

	// 6) Toggle Mes images / Communauté
        imageToggle.on('change', function () {
                const isCommunity = $(this).is(':checked');
                displayGeneratedImages(isCommunity ? communityImages : myGeneratedImages);
                $('#switch-label-left').toggleClass('active', !isCommunity);
                $('#switch-label-right').toggleClass('active', isCommunity);
        });

        // 6b) Toggle affichage 3D
        toggle3D.on('change', function () {
                if ($(this).is(':checked') && selectedVariant.url_3d) {
                        $('#product3DContainer').show();
                        if (!threeDInitialized) {
                                init3DScene('product3DContainer', selectedVariant.url_3d, selectedVariant.color);
                                threeDInitialized = true;
                        }
                } else {
                        $('#product3DContainer').hide();
                }
        });

	// 7) Clic sur une miniature
        siteFilesList.on('click', '.image-thumbnail', function () {
                const url = $(this).data('image-url');
                CanvasManager.addImage(url);
                imageSourceModal.hide();
                releaseFocus(imageSourceModal);
                addImageButton.hide();
                visualHeader.css('display', 'flex').show();
                imageControls.css('display', 'flex').show();
        });

        pcFilesList.on('click', '.image-thumbnail', function () {
                const url = $(this).data('image-url');
                CanvasManager.addImage(url);
                imageSourceModal.hide();
                releaseFocus(imageSourceModal);
                addImageButton.hide();
                visualHeader.css('display', 'flex').show();
                imageControls.css('display', 'flex').show();
        });

        alignLeftButton.on('click', function () {
                CanvasManager.alignImage('left');
        });
        alignCenterButton.on('click', function () {
                CanvasManager.alignImage('center');
        });
        alignRightButton.on('click', function () {
                CanvasManager.alignImage('right');
        });
        alignTopButton.on('click', function () {
                CanvasManager.alignImage('top');
        });
        alignMiddleButton.on('click', function () {
                CanvasManager.alignImage('middle');
        });
        alignBottomButton.on('click', function () {
                CanvasManager.alignImage('bottom');
        });

        removeImageButton.on('click', function () {
                CanvasManager.removeImage();
                addImageButton.show();
                imageControls.hide();
                visualHeader.hide();
        });

        $(document).on('keydown', function (e) {
                if (e.key === 'Escape') {
                        if (imageSourceModal.is(':visible')) {
                                imageSourceModal.hide();
                                releaseFocus(imageSourceModal);
                        } else if (customizeModal.is(':visible')) {
                                customizeModal.hide();
                                releaseFocus(customizeModal);
                                addImageButton.show();
                                imageControls.hide();
                        }
                }

                if (e.key === 'Delete' && customizeModal.is(':visible')) {
                        CanvasManager.removeImage();
                        addImageButton.show();
                        imageControls.hide();
                        visualHeader.hide();
                }
        });


	async function fetchUserImages() {
		try {
			const response = await fetch(`/wp-json/customiizer/v1/user-images/?user_id=${currentUser.ID}`);
			const data = await response.json();

			if (Array.isArray(data)) {
				displayUserImages(data);
			} else {
				pcFilesList.html('<p style="color:white;">Aucune image importée.</p>');
			}
		} catch (error) {
			console.error("[UserImages] Erreur API :", error);
		}
	}

	function displayUserImages(images) {
		pcFilesList.empty();
		if (!images.length) {
			pcFilesList.append('<p style="color:white;">Aucune image importée.</p>');
			return;
		}
		images.forEach(image => {
			pcFilesList.append(`
				<div class="site-image">
					<img src="${image.image_url}" 
						 alt="Image utilisateur" 
						 class="image-thumbnail" 
						 data-image-url="${image.image_url}">
				</div>
			`);
		});
	}

	uploadPcImageButton.on('click', function () {
		const input = $('<input type="file" accept="image/png, image/jpeg">');
		input.on('change', async function (e) {
			const file = e.target.files[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = async function (evt) {
				await uploadFileToServer({
					name: file.name,
					size: file.size,
					url: evt.target.result
				});
			};
			reader.readAsDataURL(file);
		});
		input.click();
	});

        async function uploadFileToServer(fileData) {
                try {
                        const response = await fetch("/wp-json/customiizer/v1/upload-image/", {
                                method: 'POST',
                                headers: {
                                        'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                        url: fileData.url,
                                        name: fileData.name,
                                        size: fileData.size,
                                        user_id: currentUser.ID
                                })
                        });

                        const result = await response.json();
                        console.log("result :",result);
                        if (result.success) {
                                fetchUserImages();
                        } else {
                                alert("Erreur lors du téléversement.");
                        }
                } catch (error) {
                        console.error("[Upload] Erreur serveur :", error);
                        alert("Erreur lors du téléversement.");
                }
        }

        // Recherche dans les listes d'images
        jQuery('#searchInput').on('input', function () {
                const searchValue = jQuery(this).val().toLowerCase();

                jQuery('#siteFilesList .site-image').each(function () {
                        const altText = jQuery(this).find('.image-thumbnail').attr('alt') || '';
                        jQuery(this).toggle(altText.toLowerCase().includes(searchValue));
                });

                jQuery('#pcFilesList .site-image').each(function () {
                        const fileUrl = jQuery(this).find('.image-thumbnail').attr('src') || '';
                        const fileName = fileUrl.split('/').pop().split('.').slice(0, -1).join('.').toLowerCase();
                        jQuery(this).toggle(fileName.includes(searchValue));
                });
        });
});
