<?php
/*
Template Name: Header
*/

if ( ! defined( 'ABSPATH' ) ) {
        exit; // Exit if accessed directly.
}

$current_user   = wp_get_current_user();
$user_logged_in = is_user_logged_in();
$user_id        = $current_user->ID;
$user_nicename  = $current_user->user_nicename;
$display_name   = $current_user->display_name;
$loyalty_points = ( $user_logged_in && function_exists( 'customiizer_get_loyalty_points' ) ) ? customiizer_get_loyalty_points( $user_id ) : 0;
?>

<!DOCTYPE html>
<html <?php language_attributes(); ?>>
	<head>
		<meta charset="<?php bloginfo('charset'); ?>">
		<meta name="viewport" content="width=device-width, initial-scale=1">
               <!-- Font Awesome moved to assets.php -->
		<?php wp_head(); ?>
               <!-- logo styles moved to header.css -->
	</head>
	<body <?php body_class(); ?>>
		<header id="header">
			<div class="header-content">
				<div class="logo-container">

					<div class="logo">
                                                <a href="<?php echo esc_url( home_url( '/home' ) ); ?>">
                                                        <img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/full_logo.png" alt="Logo du site">
                                                </a>
					</div>

                                       <div class="mobile-menu-toggle" aria-expanded="false" aria-label="Menu mobile">
                                               <i class="fas fa-bars"></i>
                                       </div>

                                       <nav class="mobile-menu">
                                                <a href="/boutique">Boutique</a>
                                                <a href="/customiize">Customiize</a>
                                                <a href="/communaute">Communauté</a>
                                        </nav>
					<!-- 🎯 Bloc Early Access sous le logo -->
					<?php
					$pages_autorisees = ['boutique', 'home']; 

					if (is_page($pages_autorisees) || is_front_page()):
					?>
                                        <div class="early-access-banner">
                                                🔥 <strong>Early Access</strong> – <span class="highlight">-30%</span> avec le code <strong>CUSTOM30</strong><br>
                                                <span class="version-info">Version <?php echo esc_html(customiizer_frontend_version()); ?></span>

                                        </div>
                                        <?php endif; ?>

                                </div>
                                <div class="menu-container">
                                        <nav class="main-menu">
                                                <div><a href="/boutique">Boutique</a></div>
                                                <div><a href="/customiize">Customiize</a></div>
                                                <div><a href="/communaute">Communauté</a></div>
                                        </nav>
				</div>
                                <div class="account-icons-container">
<?php if ( function_exists( 'customiizer_loyalty_widget' ) ) : ?>
                                        <div class="loyalty-header-container">
                                                <button type="button" id="loyalty-widget-button" class="loyalty-header-button icon-button" aria-haspopup="dialog" aria-expanded="false">
                                                        <i class="fas fa-gift" aria-hidden="true"></i>
                                                        <span class="loyalty-header-label"><?php echo esc_html__( 'Mes avantages', 'customiizer' ); ?></span>
                                                </button>
                                                <?php if ( $user_logged_in && function_exists( 'customiizer_get_loyalty_points' ) ) : ?>
                                                <div class="loyalty-header-points" title="<?php echo esc_attr__( 'Vos CustomPoints disponibles', 'customiizer' ); ?>">
                                                        <img src="<?php echo esc_url( get_stylesheet_directory_uri() . '/images/customiizerSiteImages/customPoint.png' ); ?>" alt="" aria-hidden="true">
                                                        <span class="loyalty-header-points-value"><?php echo esc_html( number_format_i18n( $loyalty_points ) ); ?></span>
                                                        <span class="loyalty-header-points-label"><?php echo esc_html__( 'pts', 'customiizer' ); ?></span>
                                                </div>
                                                <?php else : ?>
                                                <div class="loyalty-header-points loyalty-header-points--guest">
                                                        <span class="loyalty-header-points-label"><?php echo esc_html__( 'Découvrir', 'customiizer' ); ?></span>
                                                </div>
                                                <?php endif; ?>
                                                <?php customiizer_loyalty_widget(); ?>
                                        </div>
<?php endif; ?>

        <?php if ($user_logged_in): ?>
        <?php
        $profile_image_url = customiizer_get_profile_image_url($user_id);
        global $wpdb;
        $image_credits = intval($wpdb->get_var($wpdb->prepare("SELECT image_credits FROM WPC_users WHERE user_id = %d", $user_id)));
        ?>
        <div class="image-credits-container" title="Ces crédits servent à générer des images IA (1 crédit = 1 image)">
                <i class="fas fa-coins"></i>
                <span class="image-credits-label">Crédits:</span>
                <span id="userCredits" class="image-credits-count"><?php echo esc_html($image_credits); ?></span>
        </div>
        <?php if (class_exists('WooCommerce')): ?>
        <div class="cart-container">
                <a href="<?php echo esc_url( wc_get_cart_url() ); ?>" id="cartButton" class="icon-button" aria-label="<?php echo esc_attr__( 'Panier', 'customiizer' ); ?>">
                        <i class="fas fa-shopping-bag"></i>
                        <?php $count = WC()->cart->get_cart_contents_count(); ?>
                        <?php if ($count > 0): ?>
                        <span class="cart-count"><?php echo esc_html($count); ?></span>
                        <?php endif; ?>
                </a>
        </div>
        <?php endif; ?>
        <div class="profile-container">
                <a id="profileLink" class="icon-button">
                        <img src="<?php echo esc_url($profile_image_url); ?>" alt="Profile Image" class="user-profile-image">
                </a>
        </div>
        <?php else: ?>
        <?php if (class_exists('WooCommerce')): ?>
        <div class="cart-container">
                <a href="<?php echo esc_url( wc_get_cart_url() ); ?>" id="cartButton" class="icon-button" aria-label="<?php echo esc_attr__( 'Panier', 'customiizer' ); ?>">
                        <i class="fas fa-shopping-bag"></i>
                        <?php $count = WC()->cart->get_cart_contents_count(); ?>
                        <?php if ($count > 0): ?>
                        <span class="cart-count"><?php echo esc_html($count); ?></span>
                        <?php endif; ?>
                </a>
        </div>
        <?php endif; ?>
        <div class="login-register-container">
                <a id="loginRegisterButton" class="icon-button">
                        <i class="fas fa-user"></i>
                        <span class="login-text">Se connecter</span>
                </a>
        </div>
        <?php endif; ?>

				</div>
			</div>
               </header>

               <div id="content">
<?php
get_template_part('templates/modal', 'login');
get_template_part('templates/modal', 'user');
get_template_part('templates/modal', 'cart');
?>
                       <div id="mission-achievement">
                               <img class="mission-icon" alt="Logo">
                               <div class="mission-info">
                                       <div class="mission-title"></div>
                                       <div class="mission-details"></div>
                               </div>
                       </div>

