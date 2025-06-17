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
					<!-- Section texte et options du produit à gauche -->
					<div class="product-info">
						<!-- Menu de sélection de produit -->
						<div class="product-selector">
							<div class="custom-select">
								<div class="selected-item">
									<img id="dropdown-image" alt="Produit sélectionné" class="dropdown-image">
								</div>
								<h1 class="product-name">Nom du produit</h1>
								<div class="dropdown-icon">▼</div>
								<ul id="product-options" class="options-list"></ul>
							</div>
						</div>

						<!-- Options de couleur -->
						<div class="product-colors">
							<p>Couleurs :</p>
							<div class="colors-container"></div>
						</div>

						<!-- Options de taille -->
						<div class="product-sizes">
							<p>Tailles :</p>
							<div class="sizes-container"></div>
						</div>

						<div class="product-description">
							<button class="toggle-description">Description</button>
							<div class="description-content">
								<p>Chargement de la description...</p> <!-- Contenu mis à jour dynamiquement -->
							</div>
						</div>


						<!-- Boutons d'action -->
						<!-- Boutons d'action -->
						<div class="product-actions">
							<button id="customize-button" class="design-button">Personnaliser le design</button>
						</div>

						<p id="no-stock-message" style="display:none; color:red; margin-top:10px;">
							❌ Ce produit n’est actuellement pas disponible.
						</p>
					</div>

					<!-- Blocs de prix et de délai de livraison à droite -->
					<div class="product-details">
						<div class="price-info">
							<p class="price-title">Prix</p>
							<p class="price-value">€<span>--</span></p>
							<p class="discounted-price" style="display: none;">€<span>--</span> avec CustomPass</p>
						</div>
						<div class="delivery-info">
							<p class="delivery-title">Délai de livraison estimé</p>
							<p class="delivery-location"><img src="https://flagcdn.com/fr.svg" alt="France" class="flag-icon"> France</p>
							<p class="delivery-time"><span>--</span> jours</p>
							<p class="shipping-cost">Frais de livraison : €<span>--</span></p>
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
                                <button class="bottom-prev" aria-label="Previous images">&#9664;</button>
                                <div class="content"></div>
                                <button class="bottom-next" aria-label="Next images">&#9654;</button>
                        </div>

		</div>

	</body>
</html>
