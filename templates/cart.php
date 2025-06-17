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
		<link rel="stylesheet" type="text/css" href="<?php echo get_stylesheet_directory_uri(); ?>/styles/cart.css">
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