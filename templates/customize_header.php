<?php
/*
Template Name: Header
*/

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

get_template_part('templates/modal', 'login');
get_template_part('templates/modal', 'user');

$current_user     = wp_get_current_user();
$user_logged_in   = is_user_logged_in();
$user_id          = $current_user->ID;
$user_nicename    = $current_user->user_nicename;
$display_name     = $current_user->display_name;
$loyalty_points   = ( $user_logged_in && function_exists( 'customiizer_get_loyalty_points' ) ) ? customiizer_get_loyalty_points( $user_id ) : 0;
?>

<!DOCTYPE html>
<html <?php language_attributes(); ?>>
	<head>
		<meta charset="<?php bloginfo('charset'); ?>">
		<meta name="viewport" content="width=device-width, initial-scale=1">
               <!-- Style moved to assets.php -->
               <!-- Font Awesome moved to assets.php -->
		<?php wp_head(); ?>
        </head>
        <body <?php body_class(); ?>>
                <header id="header" class="site-header">
                        <div class="site-header__inner">
                                <button class="mobile-menu-toggle" type="button" aria-expanded="false" aria-controls="mobileMenu" aria-label="<?php esc_attr_e( 'Ouvrir le menu', 'customiizer' ); ?>">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                </button>
                                <div class="site-header__branding">
                                        <a class="site-header__logo" href="<?php echo esc_url( home_url( '/home' ) ); ?>">
                                                <img src="<?php echo esc_url( get_stylesheet_directory_uri() . '/assets/img/full_logo.png' ); ?>" alt="<?php esc_attr_e( 'Logo du site', 'customiizer' ); ?>">
                                        </a>
                                </div>
                                <nav class="site-header__nav" aria-label="<?php esc_attr_e( 'Navigation principale', 'customiizer' ); ?>">
                                        <ul class="site-nav">
                                                <li class="site-nav__item"><a class="site-nav__link ajax-link" href="<?php echo esc_url( home_url( '/customiize' ) ); ?>"><?php esc_html_e( 'Customiize', 'customiizer' ); ?></a></li>
                                                <li class="site-nav__item"><a class="site-nav__link ajax-link" href="<?php echo esc_url( home_url( '/boutique' ) ); ?>"><?php esc_html_e( 'Boutique', 'customiizer' ); ?></a></li>
                                                <li class="site-nav__item"><a class="site-nav__link ajax-link" href="<?php echo esc_url( home_url( '/communaute' ) ); ?>"><?php esc_html_e( 'Communauté', 'customiizer' ); ?></a></li>
                                                <li class="site-nav__item"><a class="site-nav__link ajax-link" id="myCreationsLink" data-redirect="account?triggerClick=true" href="<?php echo esc_url( home_url( '/account?triggerClick=true' ) ); ?>"><?php esc_html_e( 'Mes créations', 'customiizer' ); ?></a></li>
                                        </ul>
                                </nav>
                                <div class="site-header__actions">
                                        <div class="site-header__loyalty">
                                                <button id="loyalty-widget-button" class="site-action site-action--loyalty" type="button" aria-expanded="false" aria-controls="loyalty-widget-popup">
                                                        <span class="site-action__icon" aria-hidden="true"><i class="fas fa-gift"></i></span>
                                                        <span class="site-action__label-group">
                                                                <span class="site-action__eyebrow"><?php esc_html_e( 'Mes avantages', 'customiizer' ); ?></span>
                                                                <span class="site-action__label">
                                                                        <?php
                                                                        if ( $user_logged_in ) {
                                                                                echo esc_html( number_format_i18n( $loyalty_points ) );
                                                                                echo ' ' . esc_html__( 'pts', 'customiizer' );
                                                                        } else {
                                                                                esc_html_e( 'Découvrir', 'customiizer' );
                                                                        }
                                                                        ?>
                                                                </span>
                                                        </span>
                                                        <span class="site-action__chevron" aria-hidden="true"></span>
                                                </button>
                                                <?php customiizer_loyalty_widget(); ?>
                                        </div>

        <?php if ( $user_logged_in ) : ?>
        <?php
        $profile_image_url = customiizer_get_profile_image_url( $user_id );
        global $wpdb;
        $image_credits = intval( $wpdb->get_var( $wpdb->prepare( 'SELECT image_credits FROM WPC_users WHERE user_id = %d', $user_id ) ) );
        ?>
                                        <div class="image-credits-container" title="<?php esc_attr_e( 'Ces crédits servent à générer des images IA (1 crédit = 1 image)', 'customiizer' ); ?>">
                                                <span class="image-credits-icon" aria-hidden="true"><i class="fas fa-coins"></i></span>
                                                <div class="image-credits-info">
                                                        <span class="image-credits-label"><?php esc_html_e( 'Crédits', 'customiizer' ); ?></span>
                                                        <span id="userCredits" class="image-credits-count"><?php echo esc_html( $image_credits ); ?></span>
                                                </div>
                                        </div>
        <?php if ( class_exists( 'WooCommerce' ) ) : ?>
                                        <div class="cart-container">
                                                <a href="<?php echo esc_url( wc_get_cart_url() ); ?>" class="icon-button">
                                                        <span class="icon-button__icon" aria-hidden="true"><i class="fas fa-shopping-bag"></i></span>
                                                        <span class="cart-text"><?php esc_html_e( 'Panier', 'customiizer' ); ?></span>
                                                        <?php $count = WC()->cart->get_cart_contents_count(); ?>
                                                        <?php if ( $count > 0 ) : ?>
                                                                <span class="cart-count"><?php echo esc_html( $count ); ?></span>
                                                        <?php endif; ?>
                                                </a>
                                        </div>
        <?php endif; ?>
                                        <div class="profile-container">
                                                <a id="profileLink" class="icon-button">
                                                        <img src="<?php echo esc_url( $profile_image_url ); ?>" alt="<?php esc_attr_e( 'Photo de profil', 'customiizer' ); ?>" class="user-profile-image">
                                                </a>
                                        </div>
        <?php else : ?>
        <?php if ( class_exists( 'WooCommerce' ) ) : ?>
                                        <div class="cart-container">
                                                <a href="<?php echo esc_url( wc_get_cart_url() ); ?>" class="icon-button">
                                                        <span class="icon-button__icon" aria-hidden="true"><i class="fas fa-shopping-bag"></i></span>
                                                        <span class="cart-text"><?php esc_html_e( 'Panier', 'customiizer' ); ?></span>
                                                        <?php $count = WC()->cart->get_cart_contents_count(); ?>
                                                        <?php if ( $count > 0 ) : ?>
                                                                <span class="cart-count"><?php echo esc_html( $count ); ?></span>
                                                        <?php endif; ?>
                                                </a>
                                        </div>
        <?php endif; ?>
                                        <div class="login-register-container">
                                                <a id="loginRegisterButton" class="icon-button">
                                                        <span class="icon-button__icon" aria-hidden="true"><i class="fas fa-user"></i></span>
                                                        <span class="login-text"><?php esc_html_e( 'Se connecter', 'customiizer' ); ?></span>
                                                </a>
                                        </div>
        <?php endif; ?>
                                </div>
                        </div>
                        <nav id="mobileMenu" class="mobile-menu" aria-label="<?php esc_attr_e( 'Navigation mobile', 'customiizer' ); ?>">
                                <a href="<?php echo esc_url( home_url( '/customiize' ) ); ?>"><?php esc_html_e( 'Customiize', 'customiizer' ); ?></a>
                                <a href="<?php echo esc_url( home_url( '/boutique' ) ); ?>"><?php esc_html_e( 'Boutique', 'customiizer' ); ?></a>
                                <a href="<?php echo esc_url( home_url( '/communaute' ) ); ?>"><?php esc_html_e( 'Communauté', 'customiizer' ); ?></a>
                                <a href="<?php echo esc_url( home_url( '/account?triggerClick=true' ) ); ?>" id="mobileMyCreationsLink"><?php esc_html_e( 'Mes créations', 'customiizer' ); ?></a>
                        </nav>
                        <script>
                        document.addEventListener('DOMContentLoaded', function () {
                                const toggle = document.querySelector('.mobile-menu-toggle');
                                const menu = document.getElementById('mobileMenu');
                                if (!toggle || !menu) {
                                        return;
                                }

                                const toggleMenu = function (forceOpen) {
                                        const willOpen = typeof forceOpen === 'boolean' ? forceOpen : !menu.classList.contains('mobile-menu--open');
                                        menu.classList.toggle('mobile-menu--open', willOpen);
                                        toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                                };

                                toggle.addEventListener('click', function (event) {
                                        event.preventDefault();
                                        toggleMenu();
                                });

                                menu.querySelectorAll('a').forEach(function (link) {
                                        link.addEventListener('click', function () {
                                                toggleMenu(false);
                                        });
                                });

                                document.addEventListener('click', function (event) {
                                        if (!menu.contains(event.target) && !toggle.contains(event.target)) {
                                                toggleMenu(false);
                                        }
                                });
                        });
                        </script>
                </header>

                <!-- JS global config -->
                <script>
                        var baseUrl = '<?php echo get_site_url(); ?>';
                        var ajaxurl = baseUrl + '/wp-admin/admin-ajax.php';
                        var userIsLoggedIn = <?php echo $user_logged_in ? 'true' : 'false'; ?>;
                        var currentUser = {
                                ID: <?php echo $user_id; ?>,
                                user_nicename: "<?php echo esc_js($user_nicename); ?>",
                                display_name: "<?php echo esc_js($display_name); ?>"
                        };
                </script>
               <script>
                       jQuery(document).ready(function($) {
                               $('#myCreationsLink').on('click', function(event) {
                                       if (!userIsLoggedIn) {
                                               event.preventDefault();

                                               // Stocke l’intention dans sessionStorage
                                               sessionStorage.setItem("redirectAfterLogin", "myCreations");

                                               $('#loginModal').fadeIn(300);
                                               return false;
                                       }
                               });
                       });
               </script>

        </body>
</html>