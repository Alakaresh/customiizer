z<!DOCTYPE html>
<html <?php language_attributes(); ?>>
	<head>
		<meta charset="<?php bloginfo('charset'); ?>">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<?php wp_head(); ?>
	</head>
	<body <?php body_class(); ?>>
		<!-- Le reste de votre contenu de page va ici... -->

		<!-- Footer -->
		<footer>
			<!-- Blue Band with Centered Links and Right-Aligned Social Icons -->
			<div class="upper-band">
				<!-- Centered Links -->
				<div class="footer-links-container">
					<div class="footer-links">
						<a href="/mentions-legales" class="footer-link">Mentions légales</a>
						<a href="/conditions" class="footer-link">Conditions générales</a>
						<a href="/confidentialite" class="footer-link">Politique de confidentialité</a>
						<a href="/retours" class="footer-link">Politique de retour</a>
						<a href="/cookies" class="footer-link">Gestion des cookies</a>
						<a href="/contact" class="footer-link">Contact</a>
					</div>
				</div>

				<!-- Right-Aligned Social Icons -->
				<div class="social-icons">
					<a href="https://instagram.com/customiizer" target="_blank" class="social-icon" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
					<a href="https://tiktok.com/customiizer" target="_blank" class="social-icon" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>
				</div>
			</div>
			<!-- Lower Black Band for Copyright -->
			<div class="lower-band">
				<p>Copyright &copy; 2024 Customiizer | Powered by Customiizer</p>
			</div>
		</footer>
		<?php wp_footer(); ?>
	</body>
</html>
