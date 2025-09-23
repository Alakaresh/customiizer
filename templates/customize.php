<?php
/*
Template Name: Customize
get_template_part('templates/customize_header');
*/
get_template_part('header');


function load_sidebar_content() {
	$path = $_SERVER['REQUEST_URI'];

	if (strpos($path, '/customiize') !== false) {
		get_template_part('templates/generate/sidebar', 'header');
		get_template_part('templates/generate/sidebar', 'content');
		get_template_part('templates/generate/sidebar', 'footer');
	} elseif (strpos($path, '/boutique') !== false) {
	} elseif (strpos($path, '/configurateur') !== false) {
	}
}

function load_main_content() {
	$path = $_SERVER['REQUEST_URI'];
	if (strpos($path, '/customiize') !== false) {
		get_template_part('templates/generate/main', 'content');
	} elseif (strpos($path, '/boutique') !== false) {
		get_template_part('templates/shop/main', 'content');
	} elseif (strpos($path, '/configurateur') !== false) {
		get_template_part('templates/product/main', 'content');
		get_template_part('templates/product/main', 'design');
	} elseif (strpos($path, '/communaute') !== false) {
		get_template_part('templates/community/main', 'content');
	} elseif (strpos($path, '/mycreation') !== false) {
		get_template_part('templates/mycreation/main', 'content');
	}
}
?>

<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<?php wp_head(); ?>
	</head>
	<body>
		<main id="site-content" class="full-content">
			<div id="customize-main">
				<?php if (strpos($_SERVER['REQUEST_URI'], '/customiize') !== false) { ?>
				<?php get_template_part('templates/generate/customize', 'main'); ?>
				<?php } ?>

				<!-- Left Sidebar - Only for /generate and /v2shop pages -->
				<?php if (strpos($_SERVER['REQUEST_URI'], '/customiize') !== false || strpos($_SERVER['REQUEST_URI'], '/v2shop') !== false) { ?>
				<div id="left-sidebar" class="sidebar-shop">
					<?php load_sidebar_content(); ?>
				</div>
				<?php } ?>


				<!-- Main Content -->
				<div id="content">
					<?php load_main_content(); ?>
				</div>

			</div>
		</main>
		<?php wp_footer(); ?>
	</body>
</html>
