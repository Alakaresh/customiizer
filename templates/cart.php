<?php
/*
Template Name: Cart
*/

get_header();
?>

<!DOCTYPE html>
<html lang="en">

	<head>
		<meta charset="utf-8">
               <!-- Style moved to assets.php -->
	</head>

	<body>

		<main id="site-content" class="site-content">
			<?php
			// Afficher le panier avec le shortcode de WooCommerce
			echo do_shortcode('[woocommerce_cart]');
			?>
		</main>

	</body>
</html>

<?php
get_footer();
?>