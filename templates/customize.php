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

<main id="site-content" class="site-content customiize-page">
        <div class="customiize-shell">
                <?php if (strpos($_SERVER['REQUEST_URI'], '/customiize') !== false) : ?>
                        <section class="customiize-intro" aria-label="<?php esc_attr_e('Présentation de Customiize', 'customiizer'); ?>">
                                <?php get_template_part('templates/generate/customize', 'main'); ?>
                        </section>
                <?php endif; ?>

                <div id="customize-main" class="customiize-layout">
                        <?php if (strpos($_SERVER['REQUEST_URI'], '/customiize') !== false || strpos($_SERVER['REQUEST_URI'], '/v2shop') !== false) : ?>
                                <aside id="left-sidebar" class="sidebar customiize-panel customiize-panel--left" aria-label="<?php esc_attr_e('Options de création', 'customiizer'); ?>">
                                        <div class="customiize-panel__inner">
                                                <?php load_sidebar_content(); ?>
                                        </div>
                                </aside>
                        <?php endif; ?>

                        <section id="content" class="customiize-panel customiize-panel--content" aria-label="<?php esc_attr_e('Zone principale de personnalisation', 'customiizer'); ?>">
                                <div class="customiize-panel__inner customiize-panel__inner--flush">
                                        <?php load_main_content(); ?>
                                </div>
                        </section>

                        <aside id="right-sidebar" class="sidebar customiize-panel customiize-panel--right <?php echo (strpos($_SERVER['REQUEST_URI'], '/customiize') !== false) ? '' : 'hidden'; ?>" aria-label="<?php esc_attr_e('Galerie des créations récentes', 'customiizer'); ?>">
                                <div class="customiize-panel__header">
                                        <?php
                                        if (strpos($_SERVER['REQUEST_URI'], '/customiize') !== false) {
                                                get_template_part('templates/generate/RightSidebar', 'header');
                                        }
                                        ?>
                                </div>
                                <div id="sidebar-content" class="customiize-panel__inner customiize-panel__inner--scroll">
                                        <?php if (strpos($_SERVER['REQUEST_URI'], '/customiize') !== false) {
                                                get_template_part('templates/generate/RightSidebar', 'content');
                                        } ?>
                                </div>
                        </aside>
                </div>
        </div>
</main>

<?php get_footer(); ?>
