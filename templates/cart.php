<?php
/*
Template Name: Cart
*/

get_header();
?>

<main id="site-content" class="site-content">
    <?php
    // Afficher le panier avec le shortcode de WooCommerce
    echo do_shortcode('[woocommerce_cart]');
    ?>
</main>

<?php
get_footer();
?>
