<?php
/*
Template Name: Customize
*/
get_header();


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

				<!-- Right Sidebar - Only for /generate page -->
				<div id="right-sidebar" class="sidebar <?php echo (strpos($_SERVER['REQUEST_URI'], '/customiize') !== false) ? '' : 'hidden'; ?>">
					<div id="sidebar-header">
						<?php
						// Charge le header de la sidebar uniquement pour les pages spécifiques
						if (strpos($_SERVER['REQUEST_URI'], '/customiize') !== false) {
							get_template_part('templates/generate/RightSidebar', 'header');
						}
						?>
					</div>
					<div id="sidebar-content">
						<?php if (strpos($_SERVER['REQUEST_URI'], '/customiize') !== false) {
	get_template_part('templates/generate/RightSidebar', 'content');
} ?>
					</div>
				</div>
			</div>
               </main>
               <?php wp_footer(); ?>
<?php get_footer(); ?>

