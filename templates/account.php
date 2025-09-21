<?php
/*
Template Name: Account
*/

get_header();

$current_user   = wp_get_current_user();
$display_name   = ( $current_user && $current_user->exists() ) ? $current_user->display_name : __( 'Créateur', 'customiizer' );
$preferred_name = trim( $current_user->first_name );

if ( '' === $preferred_name ) {
        $preferred_name = $display_name;
}
?>

<main id="site-content" class="site-content account-page">
        <section class="account-workspace">
                <div class="account-page__container">
                        <div id="profile" class="profile">
                                <?php get_template_part( 'templates/profile/sidebar' ); ?>
                                <div id="main-container" class="main-container account-surface"></div>
                        </div>
                </div>
        </section>

        <script>
                if (typeof baseUrl === 'undefined') {
                        var baseUrl = window.location.origin;
                }
                var ajaxurl = baseUrl + '/wp-admin/admin-ajax.php';
        </script>
</main>

<?php
get_footer();
?>