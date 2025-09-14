<!-- Modal principal -->
<div id="customizeModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="customizeModalTitle">
        <div class="modal-content">
        <div class="modal-header">
                <h2 id="customizeModalTitle"></h2>
                
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
                                        <button id="alignLeftButton" class="align-button" title="Aligner à gauche"><i class="fas fa-arrow-left"></i></button>
                                        <button id="alignCenterButton" class="align-button" title="Aligner au centre"><i class="fas fa-arrows-alt-h"></i></button>
                                        <button id="alignRightButton" class="align-button" title="Aligner à droite"><i class="fas fa-arrow-right"></i></button>
                                        <button id="alignTopButton" class="align-button" title="Aligner en haut"><i class="fas fa-arrow-up"></i></button>
                                        <button id="alignMiddleButton" class="align-button" title="Centrer verticalement"><i class="fas fa-arrows-alt-v"></i></button>
                                        <button id="alignBottomButton" class="align-button" title="Aligner en bas"><i class="fas fa-arrow-down"></i></button>
                                        <button id="rotateLeftButton" class="align-button" title="Pivoter à gauche"><i class="fas fa-undo"></i></button>
                                        <button id="rotateRightButton" class="align-button" title="Pivoter à droite"><i class="fas fa-redo"></i></button>
                                        <button id="mirrorImageButton" class="align-button" title="Retourner horizontalement"><i class="fas fa-retweet"></i></button>
                                        <button id="bringForwardButton" class="align-button" title="Mettre au premier plan"><i class="fas fa-layer-group"></i></button>
                                        <button id="sendBackwardButton" class="align-button" title="Envoyer à l'arrière-plan"><i class="fas fa-layer-group"></i></button>
                                        <button id="removeImageButton" class="remove-image-button" title="Supprimer l'image"><i class="fas fa-trash"></i></button>
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
<div id="imageSourceModal" class="modal">
    <div class="modal-content file-library-modal">
        <div id="folder-selector" class="file-library-sidebar">
            <h3 class="sidebar-title">Sources d'images</h3>
            <button id="folder-site" class="active">Images du site</button>
            <button id="folder-user">Images importées</button>
            <div id="fileDropZone" class="file-drop-zone">
                <i class="fas fa-upload" aria-hidden="true"></i>
                <span>Glisser-déposer des fichiers<br>ou<br>Recherchez des fichiers</span>
                <input id="fileInput" type="file" accept="image/*" multiple hidden />
            </div>
        </div>
        <div class="file-library-main">
            <span class="close-button">&times;</span>
            <h2>Bibliothèque de fichiers</h2>

            <!-- Barres de contrôle : tri, recherche, vue -->
            <div class="file-controls">
                <input id="searchInput" type="text" placeholder="Rechercher…" />
                <div id="view-toggle" class="view-toggle">
                    <button id="view-grid" class="active">Grille</button>
                    <button id="view-list">Liste</button>
                </div>
                <div class="sort-wrapper">
                    <label for="sort-select">Trié par</label>
                    <select id="sort-select">
                        <option value="name">Nom</option>
                        <option value="date" selected>Date</option>
                    </select>
                </div>
            </div>

            <!-- Conteneur dynamique -->
            <div id="fileList" class="file-list grid-view"></div>
            <div id="paginationControls" class="pagination-controls"></div>
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
