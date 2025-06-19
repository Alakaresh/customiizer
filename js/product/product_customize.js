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

let currentRatio = '';
let filterFavorites = false;

function filterAndDisplayImages(images) {
        let filtered = images;
        if (currentRatio) {
                filtered = filtered.filter(img => img.format === currentRatio);
        }
        if (filterFavorites) {
                filtered = filtered.filter(img => img.favorited_by_user === true);
        }
        displayGeneratedImages(filtered);
}
function uploadBase64ToServer(base64Data, debugId) {
        if (!debugId) {
                debugId = `image_${Date.now()}`;
        }
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

                if (typeof window.showLoadingOverlay === 'function') {
                        window.showLoadingOverlay();
                }

                const base64 = CanvasManager.exportPrintAreaPNG();
                uploadBase64ToServer(base64).then(response => {
                        if (!response.success) {
                                alert("Erreur lors de l'envoi de l’image : " + response.message);
                                return;
                        }

                        const publicImageUrl = response.data.image_url + '?v=' + Date.now();
                        const mockupData = {
                                image_url: publicImageUrl,
                                product_id: currentProductId || null,
                                variant_id: selectedVariant?.variant_id || null,
                                placement: selectedVariant?.placement || selectedVariant?.zone_3d_name || null,
                                technique: selectedVariant?.technique || null,
                                width: selectedVariant.print_area_width,
                                height: selectedVariant.print_area_height,
                                left: 0,
                                top: 0
                        };

                        console.log("[Mockup] 🌐 Données prêtes avec image URL :", mockupData);
                        generateMockup(mockupData);
                });

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
        const unsavedChangesModal = $('#unsavedChangesModal');
        const confirmQuitButton = $('#confirmQuitButton');
        const cancelQuitButton = $('#cancelQuitButton');
        const closeButtonUnsaved = $('#unsavedChangesModal .close-button');
        const addImageButton = $('#addImageButton');
        const imageSourceModal = $('#imageSourceModal');
        const closeButtonImageModal = $('#imageSourceModal .close-button');
        const uploadPcImageButton = $('#uploadPcImageButton');
        const imageToggle = $('#imageToggle');
        const ratioFilter = $('#ratioFilter');

        // Avertir en cas de fermeture de la page avec des modifications non sauvegardées
        window.addEventListener('beforeunload', function (e) {
                if (customizeModal.is(':visible') && CanvasManager.hasImage()) {
                        e.preventDefault();
                        e.returnValue = '';
                }
        });

        const favoriteFilter = $('#favoriteFilter');

        const toggle3D = $('#toggle3D');
        const alignLeftButton = $('#alignLeftButton');
        const alignCenterButton = $('#alignCenterButton');
        const alignRightButton = $('#alignRightButton');
        const alignTopButton = $('#alignTopButton');
        const alignMiddleButton = $('#alignMiddleButton');
        const alignBottomButton = $('#alignBottomButton');
        const mirrorImageButton = $('#mirrorImageButton');
        const bringForwardButton = $('#bringForwardButton');
        const sendBackwardButton = $('#sendBackwardButton');
        const removeImageButton = $('#removeImageButton');
        const imageControls = $('.image-controls');
        const visualHeader = $('.visual-header');
        const sidebarChangeProductButton = $('#sidebarChangeProductButton');
        const sidebarAddImageButton = $('#sidebarAddImageButton');
        const productSidebar = $('#product-sidebar');
        const hideProductSidebarButton = $('#hideProductSidebar');
        let sidebarVariants = [];
        let threeDInitialized = false;

        currentRatio = selectedVariant?.ratio_image || '';
        ratioFilter.val('current');
        favoriteFilter.val('all');
        filterFavorites = false;

        const startCommunity = imageToggle.is(':checked');
        filterAndDisplayImages(startCommunity ? communityImages : myGeneratedImages);

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

       function updateAddImageButtonVisibility() {
               if (CanvasManager.hasImage()) {
                       addImageButton.hide();
                       visualHeader.css('display', 'flex');
                       $('.visual-zone').addClass('with-header');
                       imageControls.css('display', 'flex').show();
                       CanvasManager.resizeToContainer('product2DContainer');
               } else {
                       addImageButton.show();
                       imageControls.hide();
                       visualHeader.css('display', 'none');
                       $('.visual-zone').removeClass('with-header');
                       CanvasManager.resizeToContainer('product2DContainer');
               }
       }


       function renderSidebarOptions(variants, preselect) {

               const colorsContainer = productSidebar.find('.colors-container').empty();
               const sizesContainer = productSidebar.find('.sizes-container').empty();

               const colorSet = new Set();
               variants.forEach(v => { if (v.color) colorSet.add(v.color); });

               Array.from(colorSet).forEach((color, idx) => {
                       const disabled = !variants.some(v => v.color === color && v.stock !== 'out of stock' && v.stock !== 'discontinued');
                       const opt = $('<div>').addClass('color-option')
                               .css('background-color', color)
                               .attr('data-color', color)
                               .toggleClass('disabled', disabled)
                               .on('click', function () {
                                       if ($(this).hasClass('disabled')) return;
                                       productSidebar.find('.color-option').removeClass('selected');
                                       $(this).addClass('selected');
                                       updateSidebarSelectedVariant();
                               });
                       colorsContainer.append(opt);
                       const shouldSelect = preselect ? preselect.color === color : idx === 0;
                       if (shouldSelect && !disabled) opt.addClass('selected');
               });

               const sizeMap = {};
               variants.forEach(v => { if (v.size && !sizeMap[v.size]) sizeMap[v.size] = v.stock; });
               Object.entries(sizeMap).forEach(([size, stock], idx) => {
                       const opt = $('<div>').addClass('size-option')
                               .text(size)
                               .attr('data-size', size)
                               .toggleClass('disabled', stock === 'out of stock' || stock === 'discontinued')
                               .on('click', function () {
                                       if ($(this).hasClass('disabled')) return;
                                       productSidebar.find('.size-option').removeClass('selected');
                                       $(this).addClass('selected');
                                       updateSidebarSelectedVariant();
                               });
                       sizesContainer.append(opt);
                       const shouldSelect = preselect ? preselect.size === size : idx === 0;
                       if (shouldSelect && !opt.hasClass('disabled')) opt.addClass('selected');

               });

               if (colorSet.size <= 1) {
                       productSidebar.find('.product-colors').hide();
               } else {
                       productSidebar.find('.product-colors').show();
               }

       }

       async function loadVariantInCustomizer(variant) {
               try {
                       let template = window.customizerCache.templates[variant.variant_id];
                       if (!template) {
                               const res = await fetch(`/wp-json/custom-api/v1/variant-template/${variant.variant_id}`);
                               const data = await res.json();
                               if (!data.success || !data.template) {
                                       console.error('[UI] template not found for variant', variant.variant_id);
                                       return;
                               }
                               template = data.template;
                               window.customizerCache.templates[variant.variant_id] = template;
                       }
                       CanvasManager.init(template, 'product2DContainer');
                       updateAddImageButtonVisibility();
                       if (variant.url_3d && toggle3D.is(':checked')) {
                               $('#product3DContainer').show();
                               init3DScene('product3DContainer', variant.url_3d, variant.color);
                               threeDInitialized = true;
                       } else {
                               $('#product3DContainer').hide();
                       }
               } catch (e) {
                       console.error('[Sidebar] failed to load variant template', e);
               }
       }

       function updateSidebarSelectedVariant() {
               const selectedColor = productSidebar.find('.color-option.selected').attr('data-color');
               const selectedSize = productSidebar.find('.size-option.selected').attr('data-size');
               const variant = sidebarVariants.find(v =>
                       (!selectedColor || v.color === selectedColor) &&
                       (!selectedSize || v.size === selectedSize)
               );
               if (variant) {
                       selectedVariant = variant;
                       loadVariantInCustomizer(variant);
                       $(document).trigger('variantReady', [variant]);
                       productSidebar.removeClass('open');
               }
       }

        // 2) Ouvrir le modal de personnalisation
        customizeButton.on('click', async function () {
                threeDInitialized = false;
                fetchUserImages(); // images perso si besoin
                customizeModal.show();
                const productImageSrc = jQuery("#product-main-image").attr("src");
                jQuery("#footerProductImage").attr("src", productImageSrc);
                const productName = jQuery(".product-name").text().trim();
                jQuery("#customizeModalTitle").text(productName);
                jQuery(".summary-name").text(productName);
                const productPrice = jQuery(".price-value span").text().trim();
                jQuery(".summary-price").text(productPrice);
                imageControls.hide();
                visualHeader.css('display', 'none');
                $('.visual-zone').removeClass('with-header');
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
                        updateAddImageButtonVisibility();

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
                if (CanvasManager.hasImage()) {
                        unsavedChangesModal.show();
                        trapFocus(unsavedChangesModal);
                        return;
                }
                customizeModal.hide();
                releaseFocus(customizeModal);
                updateAddImageButtonVisibility();
        });

        confirmQuitButton.on('click', function () {
                unsavedChangesModal.hide();
                customizeModal.hide();
                releaseFocus(unsavedChangesModal);
                releaseFocus(customizeModal);
                updateAddImageButtonVisibility();
        });

        function hideUnsavedModal() {
                unsavedChangesModal.hide();
                releaseFocus(unsavedChangesModal);
        }

        cancelQuitButton.on('click', hideUnsavedModal);
        closeButtonUnsaved.on('click', hideUnsavedModal);

        // Afficher le bouton lors du changement de produit et mettre à jour le ratio
        $(document).on('productSelected', function () {
                updateAddImageButtonVisibility();
                currentRatio = selectedVariant?.ratio_image || '';
                ratioFilter.val('current');

                favoriteFilter.val('all');
                filterFavorites = false;

                const isCommunity = imageToggle.is(':checked');
                filterAndDisplayImages(isCommunity ? communityImages : myGeneratedImages);
        });

        // Mise à jour initiale quand la variante est prête
        $(document).on('variantReady', function (event, variant) {
                currentRatio = variant?.ratio_image || '';
                ratioFilter.val('current');

                favoriteFilter.val('all');
                filterFavorites = false;

                const isCommunity = imageToggle.is(':checked');
                filterAndDisplayImages(isCommunity ? communityImages : myGeneratedImages);
        });

	// 4) Ouvrir le sélecteur d’image
        addImageButton.on('click', function () {
                imageSourceModal.show();
                trapFocus(imageSourceModal);
        });

        sidebarAddImageButton.on('click', function () {
                imageSourceModal.show();
                trapFocus(imageSourceModal);
        });

        async function openProductSidebar() {
                try {
                        let data;
                        if (window.customizerCache?.variants?.[currentProductId]) {
                                data = window.customizerCache.variants[currentProductId];
                        } else {
                                const res = await fetch(`/wp-json/api/v1/products/${currentProductId}`);
                                data = await res.json();
                                if (window.customizerCache) {
                                        window.customizerCache.variants[currentProductId] = data;
                                }
                        }
                        sidebarVariants = Array.isArray(data.variants) ? data.variants : [];
                        renderSidebarOptions(sidebarVariants, selectedVariant);
                        productSidebar.addClass('open');
                } catch (e) {
                        console.error('[Sidebar] Failed to load variants', e);
                }
        }

        sidebarChangeProductButton.on('click', function () {
                openProductSidebar();
        });

        hideProductSidebarButton.on('click', function () {
                productSidebar.removeClass('open');
        });

	// 5) Fermer le sélecteur d’image
        closeButtonImageModal.on('click', function () {
                imageSourceModal.hide();
                releaseFocus(imageSourceModal);
        });

	// 6) Toggle Mes images / Communauté
        imageToggle.on('change', function () {
                const isCommunity = $(this).is(':checked');
                filterAndDisplayImages(isCommunity ? communityImages : myGeneratedImages);
                $('#switch-label-left').toggleClass('active', !isCommunity);
                $('#switch-label-right').toggleClass('active', isCommunity);
        });

        ratioFilter.on('change', function () {
                const val = $(this).val();
                if (val === 'all') {
                        currentRatio = '';
                } else if (val === 'current') {
                        currentRatio = selectedVariant?.ratio_image || '';
                } else {
                        currentRatio = val;
                }

                const isCommunity = imageToggle.is(':checked');
                filterAndDisplayImages(isCommunity ? communityImages : myGeneratedImages);
        });

        favoriteFilter.on('change', function () {
                filterFavorites = $(this).val() === 'fav';
                const isCommunity = imageToggle.is(':checked');
                filterAndDisplayImages(isCommunity ? communityImages : myGeneratedImages);
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
                CanvasManager.addImage(url, function () {
                        updateAddImageButtonVisibility();
                });
                imageSourceModal.hide();
                releaseFocus(imageSourceModal);
        });

        pcFilesList.on('click', '.image-thumbnail', function () {
                const url = $(this).data('image-url');
                CanvasManager.addImage(url, function () {
                        updateAddImageButtonVisibility();
                });
                imageSourceModal.hide();
                releaseFocus(imageSourceModal);
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
        mirrorImageButton.on('click', function () {
                CanvasManager.mirrorImage();
        });
        bringForwardButton.on('click', function () {
                CanvasManager.bringImageForward();
        });
        sendBackwardButton.on('click', function () {
                CanvasManager.sendImageBackward();
        });

        removeImageButton.on('click', function () {
                CanvasManager.removeImage();
                updateAddImageButtonVisibility();
        });

        $(document).on('keydown', function (e) {
                if (e.key === 'Escape') {
                        if (unsavedChangesModal.is(':visible')) {
                                hideUnsavedModal();
                        } else if (imageSourceModal.is(':visible')) {
                                imageSourceModal.hide();
                                releaseFocus(imageSourceModal);
                        } else if (productSidebar.hasClass('open')) {
                                productSidebar.removeClass('open');
                        } else if (customizeModal.is(':visible')) {
                                closeButtonMain.trigger('click');
                        }
                }

                if (e.key === 'Delete' && customizeModal.is(':visible')) {
                        CanvasManager.removeImage();
                        updateAddImageButtonVisibility();
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
