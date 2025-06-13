<!-- Modal principal -->
<div id="customizeModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="customizeModalTitle">
        <div class="modal-content">
                <span class="close-button">&times;</span>
                <h2 id="customizeModalTitle">Customize Product</h2>
                <div class="visual-zone">
                        <div class="visual-header">
                                <div class="image-controls">
                                        <button id="alignLeftButton" class="align-button"><i class="fas fa-arrow-left"></i></button>
                                        <button id="alignCenterButton" class="align-button"><i class="fas fa-arrows-alt-h"></i></button>
                                        <button id="alignRightButton" class="align-button"><i class="fas fa-arrow-right"></i></button>
                                        <button id="alignTopButton" class="align-button"><i class="fas fa-arrow-up"></i></button>
                                        <button id="alignMiddleButton" class="align-button"><i class="fas fa-arrows-alt-v"></i></button>
                                        <button id="alignBottomButton" class="align-button"><i class="fas fa-arrow-down"></i></button>
                                        <button id="removeImageButton" class="remove-image-button"><i class="fas fa-trash"></i></button>
                                </div>
                        </div>
                        <button id="addImageButton" class="add-image-button">Ajouter une image</button>

                        <div class="visual-containers">
                                <!-- Conteneur pour l'affichage 2D -->
                                <div id="product2DContainer">
                                        <div class="fabric-wrapper" id="productCanvasWrapper">
                                                <!-- Le canvas y sera injecté dynamiquement par Fabric.js -->
                                        </div>
                                </div>


                                <!-- Conteneur pour l'affichage 3D -->
                                <div id="product3DContainer">
                                        <canvas id="threeDCanvas"></canvas>
                                </div>
                        </div>
                </div>


                <div class="modal-footer">
                        <button id="saveDesignButton">Enregistrer</button>
                </div>
	</div>
</div>


<!-- Second modal pour choisir l'image -->
<div id="imageSourceModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="imageSourceModalTitle">
	<div class="small-modal">
		<div class="modal-header">
			<span class="close-button">&times;</span>
		</div>
               <h3 id="imageSourceModalTitle">File Library</h3>

		<!-- Section recherche et upload -->
		<div class="search-upload">
			<input type="text" id="searchInput" placeholder="Rechercher un fichier..." class="search-bar">
			<button id="uploadPcImageButton" class="source-button">Upload</button>
		</div>

		<!-- Contenu principal du modal -->
		<!-- Fichiers importés depuis le PC -->
		<div class="imported-files">
			<h4>Imported images</h4>
			<div id="pcFilesList" class="pcfile-list">
				<!-- Liste des fichiers importés sera injectée ici -->
			</div>
		</div>

		<!-- Fichiers disponibles sur le site -->
		<div class="site-files">
			<h4>Generated images</h4>
			<div class="switch-wrapper">
				<span id="switch-label-left" class="switch-label active">Mes images</span>

				<label class="switch-toggle">
					<input type="checkbox" id="imageToggle" class="switch-checkbox" false>
					<span class="slider"></span>
				</label>

				<span id="switch-label-right" class="switch-label">Communauté</span>
			</div>


			<div id="siteFilesList" class="file-list">
				<!-- Contenu dynamique injecté ici -->
			</div>
		</div>
	</div>
</div>
