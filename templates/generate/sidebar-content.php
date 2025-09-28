<div id="content-container">
	<!-- Menu de ratio masqué au départ -->
        <div id="ratio-menu" class="ratio-container" style="display: none;">
                <div id="aspect-ratio-info">
                        <span class="info-text">Sélectionnez un produit pour afficher ses formats disponibles</span>
                </div>

                <div class="product-selection">
                        <h3 class="product-selection-title">Produits</h3>
                        <p class="product-selection-description">Explorez les formats recommandés pour chaque produit en un clin d'œil.</p>
                        <div id="product-container" class="product-dropdown-wrapper">
                                <label for="product-select" class="sr-only">Sélectionnez un produit</label>
                                <select id="product-select" class="product-dropdown" aria-label="Sélectionnez un produit">
                                        <option value="" selected disabled>Sélectionnez un produit</option>
                                </select>
                        </div>
                </div>

                <div id="product-groups-container" class="product-groups is-hidden" role="list">
                        <!-- Groupes de formats injectés en JS -->
                </div>

        </div>
</div>