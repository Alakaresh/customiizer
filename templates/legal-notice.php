<?php
/*
Template Name: Mentions légales
*/
get_header();

// Chargement du CSS spécifique aux pages légales
wp_enqueue_style('legal-global', get_stylesheet_directory_uri() . '/styles/legal-global.css');
wp_enqueue_style('tablet-legal', get_stylesheet_directory_uri() . '/styles/responsive/tablet/legal.css');
wp_enqueue_style('mobile-legal', get_stylesheet_directory_uri() . '/styles/responsive/mobile/legal.css');
?>

<main id="site-content" class="site-content">
	<section class="legal-content">
		<div class="container">
			<h1>Mentions légales</h1>

			<h2>1. Éditeur du site</h2>
			<p>
				<strong>Nom de la société :</strong> Customiizer<br>
				<strong>Forme juridique :</strong> SARL<br>
				<strong>Adresse du siège social :</strong> 177 Rue de Luxembourg Helfent, 8077, Bertrange <br>
				<strong>RCS Luxembourg :</strong> B284978 <br>
				<strong>TVA intracommunautaire :</strong> LU35795901 <br>
				<strong>Email :</strong> community@customiizer.com<br>
			</p>

			<h2>2. Directeur de la publication</h2>
			<p>
				<strong>Responsable :</strong> Loïc D
			</p>

			<h2>3. Hébergeur</h2>
			<p>
				<strong>Nom :</strong> IONOS<br>
				<strong>Adresse :</strong> 7 Place de la Gare, 57200 Sarreguemines, France<br>
				<strong>Téléphone :</strong> 09 70 80 89 11<br>
				<strong>Site :</strong> <a href="https://www.ionos.fr" target="_blank" rel="noopener noreferrer">www.ionos.fr</a>
			</p>

			<h2>4. Propriété intellectuelle</h2>
			<p>
				Le site ainsi que l’ensemble de ses contenus (textes, images, illustrations, logo, etc.) sont la propriété exclusive de Customiizer, sauf indication contraire.  
				Toute reproduction, distribution ou utilisation sans autorisation est strictement interdite.
			</p>

			<h2>5. Données personnelles</h2>
			<p>
				Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d’un droit d’accès, de rectification et de suppression de vos données personnelles.  
				Pour toute demande concernant vos données, contactez-nous à <a href="mailto:contact@customiizer.com">community@customiizer.com</a>.<br>
				Voir également notre <a href="/confidentialite">Politique de confidentialité</a>.
			</p>

			<h2>6. Cookies</h2>
			<p>
				Ce site utilise des cookies pour améliorer l’expérience utilisateur et mesurer l’audience.  
				Lors de votre première visite, un bandeau vous permet de gérer vos préférences.  
				Vous pouvez les modifier à tout moment sur la page <a href="/cookies">Gestion des cookies</a>.
			</p>

			<h2>7. Conditions d'utilisation</h2>
			<p>
				L’utilisation du site Customiizer implique l’acceptation pleine et entière de nos <a href="/conditions">Conditions Générales</a> (CGU/CGV).  
				Merci de les consulter attentivement avant toute utilisation ou commande.
			</p>

		</div>
	</section>
</main>

<?php get_footer(); ?>
