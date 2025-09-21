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
        <section class="account-hero">
                <div class="account-page__container">
                        <div class="account-hero__card">
                                <div class="account-hero__intro">
                                        <span class="account-hero__eyebrow"><?php esc_html_e( 'Espace membre', 'customiizer' ); ?></span>
                                        <h1 class="account-hero__title"><?php printf( esc_html__( 'Bonjour %s', 'customiizer' ), esc_html( $preferred_name ) ); ?></h1>
                                        <p class="account-hero__description">
                                                <?php esc_html_e( 'Retrouve ton profil, tes commandes, tes créations IA et toutes les récompenses Customiizer dans un environnement pensé pour la personnalisation.', 'customiizer' ); ?>
                                        </p>
                                        <div class="account-hero__actions" aria-label="Navigation rapide">
                                                <a href="#" class="account-hero__action account-hero__action--primary" data-target="dashboard">
                                                        <i class="fas fa-chart-pie" aria-hidden="true"></i>
                                                        <span><?php esc_html_e( 'Tableau de bord', 'customiizer' ); ?></span>
                                                </a>
                                                <a href="#" class="account-hero__action" data-target="pictures">
                                                        <i class="fas fa-image" aria-hidden="true"></i>
                                                        <span><?php esc_html_e( 'Mes images', 'customiizer' ); ?></span>
                                                </a>
                                                <a href="#" class="account-hero__action" data-target="purchases">
                                                        <i class="fas fa-shopping-bag" aria-hidden="true"></i>
                                                        <span><?php esc_html_e( 'Commandes', 'customiizer' ); ?></span>
                                                </a>
                                        </div>
                                </div>
                                <div class="account-hero__highlights" aria-label="Points forts de l\'espace client">
                                        <div class="account-hero__highlight">
                                                <i class="fas fa-id-card" aria-hidden="true"></i>
                                                <div>
                                                        <span class="account-hero__highlight-title"><?php esc_html_e( 'Profil personnalisé', 'customiizer' ); ?></span>
                                                        <p class="account-hero__highlight-text"><?php esc_html_e( 'Actualise ton identité visuelle et ta photo de profil en quelques clics.', 'customiizer' ); ?></p>
                                                </div>
                                        </div>
                                        <div class="account-hero__highlight">
                                                <i class="fas fa-gem" aria-hidden="true"></i>
                                                <div>
                                                        <span class="account-hero__highlight-title"><?php esc_html_e( 'Avantages & fidélité', 'customiizer' ); ?></span>
                                                        <p class="account-hero__highlight-text"><?php esc_html_e( 'Suis tes CustomPoints, débloque des récompenses exclusives et profite de bonus.', 'customiizer' ); ?></p>
                                                </div>
                                        </div>
                                        <div class="account-hero__highlight">
                                                <i class="fas fa-rocket" aria-hidden="true"></i>
                                                <div>
                                                        <span class="account-hero__highlight-title"><?php esc_html_e( 'Créations en illimité', 'customiizer' ); ?></span>
                                                        <p class="account-hero__highlight-text"><?php esc_html_e( 'Retrouve toutes tes images générées et continue tes projets à ton rythme.', 'customiizer' ); ?></p>
                                                </div>
                                        </div>
                                </div>
                        </div>
                </div>
        </section>

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