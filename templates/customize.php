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

$path = $_SERVER['REQUEST_URI'];
$is_customiize_page = strpos($path, '/customiize') !== false;
$is_configurator_page = strpos($path, '/configurateur') !== false;
$is_hub_layout = (
        !$is_customiize_page && (
                strpos($path, '/v2shop') !== false ||
                $is_configurator_page ||
                strpos($path, '/boutique') !== false ||
                strpos($path, '/mycreation') !== false
        )
);

$body_classes = [];
if ($is_customiize_page) {
        $body_classes[] = 'customize-layout-page';
}
if ($is_hub_layout) {
        $body_classes[] = 'customize-layout-page';
        $body_classes[] = 'hub-layout-page';
}
if ($is_configurator_page) {
        $body_classes[] = 'configurator-page';
}

$main_classes = [];
if ($is_customiize_page) {
        $main_classes[] = 'customize-layout';
}
if ($is_hub_layout) {
        $main_classes[] = 'customize-layout';
        $main_classes[] = 'hub-layout';
}
$main_class_attribute = $main_classes ? ' class="' . esc_attr(implode(' ', $main_classes)) . '"' : '';
?>

<!DOCTYPE html>
<html lang="en">
        <head>
                <meta charset="utf-8">
                <?php wp_head(); ?>
        </head>
        <body <?php body_class( $body_classes ); ?>>
                <main id="site-content" class="full-content">
                        <div id="customize-main"<?php echo $main_class_attribute; ?>>
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
