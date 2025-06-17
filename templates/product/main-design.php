<!-- Modal principal -->
<div id="customizeModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="customizeModalTitle">
        <div class="modal-content">
        <div class="modal-header">
                <h2 id="customizeModalTitle"></h2>
                <div class="switch-wrapper">
                        <span class="switch-label">Afficher l’aperçu 3D</span>
                        <label class="switch-toggle">
                                <input type="checkbox" id="toggle3D" class="switch-checkbox" checked>
                                <span class="slider"></span>
                        </label>
                </div>
                <button class="close-button" aria-label="Fermer">&times;</button>
        </div>
                <div class="modal-body">
                        <div class="modal-sidebar">
                                <button id="sidebarChangeProductButton" class="sidebar-btn">
                                        <i class="fas fa-exchange-alt"></i>
                                        <span>Produit</span>
                                </button>
                                <button id="sidebarAddImageButton" class="sidebar-btn">
                                        <i class="fas fa-image"></i>
                                        <span>Image</span>
                                </button>
                        </div>
                        <div id="product-sidebar">
                                <button id="hideProductSidebar" aria-label="Masquer la sidebar">
                                        <i class="fas fa-chevron-left"></i>
                                </button>
                                <h3>Choisir une variante</h3>
                                <div class="product-colors">
                                        <p>Couleurs :</p>
                                        <div class="colors-container"></div>
                                </div>
                                <div class="product-sizes">
                                        <p>Tailles :</p>
                                        <div class="sizes-container"></div>
                                </div>
                        </div>
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
                                        <button id="bringForwardButton" class="align-button"><i class="fas fa-layer-group"></i></button>
                                        <button id="sendBackwardButton" class="align-button"><i class="fas fa-layer-group"></i></button>
                                </div>
                        </div>
                        <div class="visual-containers">
                                <!-- Conteneur pour l'affichage 2D -->
                                <div id="product2DContainer">
                                        <button id="addImageButton" class="add-image-button">Ajouter une image</button>
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
                
	</div>
		<div class="modal-footer">
                        <div class="product-summary">
                                <img id="footerProductImage" alt="Produit" />
                                <span class="summary-name"></span> - <span class="summary-price"></span>
                        </div>
                        <button id="saveDesignButton">Save to template</button>
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
                                        <input type="checkbox" id="imageToggle" class="switch-checkbox" >
                                        <span class="slider"></span>
                                </label>
                                <span id="switch-label-right" class="switch-label">Communauté</span>
                                <select id="ratioFilter" class="ratio-filter">
                                        <option value="current">Produit (ratio actuel)</option>
                                        <option value="1:1">1:1</option>
                                        <option value="4:3">4:3</option>
                                        <option value="3:4">3:4</option>
                                        <option value="16:9">16:9</option>
                                        <option value="9:16">9:16</option>
                                        <option value="all">Tous</option>
                                </select>
                                <select id="favoriteFilter" class="favorite-filter">
                                        <option value="all">Toutes</option>
                                        <option value="fav">Favoris</option>
                                </select>
                        </div>


			<div id="siteFilesList" class="file-list">
				<!-- Contenu dynamique injecté ici -->
</div>
</div>
</div>
</div>

<!-- Modal de confirmation de fermeture -->
<div id="unsavedChangesModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="unsavedChangesTitle">
    <div class="small-modal">
        <div class="modal-header">
            <h3 id="unsavedChangesTitle">Quitter la personnalisation ?</h3>
            <span class="close-button" aria-label="Annuler">&times;</span>
        </div>
        <div class="modal-body">
            <p>Cette action va annuler la personnalisation en cours.</p>
            <div class="confirm-buttons">
                <button id="confirmQuitButton" class="source-button">Quitter</button>
                <button id="cancelQuitButton" class="source-button">Annuler</button>
            </div>
        </div>
    </div>
</div>
