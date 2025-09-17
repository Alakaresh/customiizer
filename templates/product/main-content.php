<!DOCTYPE html>
<html lang="fr">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Produit</title>
	</head>
	<body>
		<div class="container">
			<div class="main-content">
				<div class="band band-left"></div>
				<div class="background">
					<img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/fond_shop.png" alt="Fond avec promontoire" class="background-image">
                                       <!-- ✅ Image principale du produit -->
                                       <img id="product-main-image" src="wp-content/themes/customiizer/images/default-image.png" alt="Produit affiché" class="product-image">
                                       <!-- 🆕 Conteneur pour l'affichage 3D du produit -->
                                       <div id="productMain3DContainer">
                                               <canvas id="productMain3DCanvas"></canvas>
                                       </div>
					<!-- Section texte et options du produit à gauche -->
					<div class="product-info">
						<!-- Menu de sélection de produit -->
                                               <div class="product-selector" data-component="variant-selector">
                                                        <p class="product-selector-label"><?php esc_html_e('Variantes', 'customiizer'); ?></p>
                                                        <div class="custom-select" data-dropdown>
                                                                <button type="button" class="selected-item" aria-haspopup="listbox" aria-expanded="false" aria-controls="product-options">
                                                                        <span class="selected-visual">
                                                                                <img id="dropdown-image" alt="Produit sélectionné" class="dropdown-image">
                                                                        </span>
                                                                        <span class="selected-text">
                                                                                <span class="selected-helper"><?php esc_html_e('Variante sélectionnée', 'customiizer'); ?></span>
                                                                                <span class="product-name" aria-live="polite">Nom du produit</span>
                                                                        </span>
                                                                </button>
                                                                <button type="button" class="dropdown-icon" aria-label="<?php esc_attr_e('Ouvrir la liste des variantes', 'customiizer'); ?>" aria-haspopup="listbox" aria-expanded="false" aria-controls="product-options">
                                                                        <span class="chevron" aria-hidden="true"></span>
                                                                </button>
                                                                <ul id="product-options" class="options-list" role="listbox" aria-hidden="true"></ul>
                                                        </div>
                                                        <h1 class="product-title visually-hidden" aria-live="polite">Nom du produit</h1>
                                                </div>

						<!-- Options de couleur -->
                                                <div class="product-colors">
                                                        <p class="product-section-label"><?php esc_html_e('Couleurs', 'customiizer'); ?></p>
                                                        <div class="colors-container"></div>
                                                </div>

                                                <!-- Options de taille -->
                                                <div class="product-sizes" data-component="size-selector">
                                                        <p class="product-section-label"><?php esc_html_e('Tailles', 'customiizer'); ?></p>
                                                        <div class="sizes-container" data-label="<?php esc_attr_e('Tailles disponibles', 'customiizer'); ?>"></div>
                                                </div>

                                                <div class="product-description" data-component="product-description">
                                                        <button class="toggle-description" type="button" aria-expanded="false">
                                                                <span class="toggle-label"><?php esc_html_e('Description', 'customiizer'); ?></span>
                                                                <span class="toggle-icon" aria-hidden="true"></span>
                                                        </button>
                                                        <div class="description-content" aria-hidden="true">
                                                                <p>Chargement de la description...</p> <!-- Contenu mis à jour dynamiquement -->
                                                        </div>
                                                </div>


                                                <!-- Boutons d'action -->
                                                <!-- Boutons d'action -->
                                                <div class="product-actions product-actions--primary">
                                                        <button id="customize-button" class="design-button" type="button">
                                                                <span class="design-button__label"><?php esc_html_e('Personnaliser le design', 'customiizer'); ?></span>
                                                        </button>
                                                </div>

						<p id="no-stock-message" style="display:none; color:red; margin-top:10px;">
							❌ Ce produit n’est actuellement pas disponible.
						</p>
					</div>

					<!-- Blocs de prix et de délai de livraison à droite -->
                                        <div class="product-details">
                                                <div class="price-info">
                                                        <p class="price-title">Prix</p>
                                                        <p class="price-value"><span>--</span> € TTC</p>
                                                        <p class="discounted-price" style="display: none;"><span>--</span> € TTC avec CustomPass</p>
                                                </div>
						<div class="delivery-info">
							<p class="delivery-title">Délai de livraison estimé</p>
							<p class="delivery-location"><img src="https://flagcdn.com/fr.svg" alt="France" class="flag-icon"> France</p>
							<p class="delivery-time"><span>--</span> jours</p>
                                                        <p class="shipping-cost">Frais de livraison : <span>--</span> €</p>
						</div>
						<div class="product-actions">
							<button class="add-to-cart-button">Ajouter au panier</button>
						</div>
					</div>
					<!-- Bulles d'images sous l'image principale -->
					<div class="image-thumbnails"></div>
				</div>
				<div class="band band-right"></div>
			</div>
                        <div class="bottom-bar">
                                <button class="bottom-arrow left">&#10094;</button>
                                <div class="image-wrapper">
                                        <div class="content"></div>
                                </div>
                                <button class="bottom-arrow right">&#10095;</button>
                        </div>

		</div>

	</body>
</html>
