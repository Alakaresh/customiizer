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

$nav_items = [
        [
                'slug'  => 'boutique',
                'label' => __( 'Boutique', 'customiizer' ),
                'url'   => '/boutique',
        ],
        [
                'slug'  => 'customiize',
                'label' => __( 'Customiize', 'customiizer' ),
                'url'   => '/customiize',
        ],
        [
                'slug'  => 'communaute',
                'label' => __( 'Communauté', 'customiizer' ),
                'url'   => '/communaute',
        ],
];

foreach ( $nav_items as &$nav_item ) {
        $is_active = false;

        switch ( $nav_item['slug'] ) {
                case 'boutique':
                        $is_active = is_page( 'boutique' )
                                || is_page( 'home' )
                                || is_front_page()
                                || ( function_exists( 'is_shop' ) && is_shop() )
                                || is_post_type_archive( 'product' )
                                || is_singular( 'product' );
                        break;
                case 'customiize':
                        $is_active = is_page( 'customiize' )
                                || is_page_template( 'templates/customize.php' );
                        break;
                case 'communaute':
                        $is_active = is_page( 'communaute' );
                        break;
        }

        $nav_item['is_active'] = $is_active;
}
unset( $nav_item );
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

                                       <div class="mobile-menu-toggle" aria-expanded="false" aria-label="<?php esc_attr_e( 'Menu mobile', 'customiizer' ); ?>" aria-controls="primaryMobileMenu">
                                               <i class="fas fa-bars"></i>
                                       </div>

                                       <nav class="mobile-menu" id="primaryMobileMenu" aria-label="<?php esc_attr_e( 'Navigation principale', 'customiizer' ); ?>" aria-hidden="true">
                                                <?php foreach ( $nav_items as $nav_item ) :
                                                        $mobile_classes = 'mobile-menu__link';
                                                        if ( $nav_item['is_active'] ) {
                                                                $mobile_classes .= ' is-active';
                                                        }
                                                ?>
                                                        <a class="<?php echo esc_attr( $mobile_classes ); ?>" href="<?php echo esc_url( $nav_item['url'] ); ?>"<?php echo $nav_item['is_active'] ? ' aria-current="page"' : ''; ?>><?php echo esc_html( $nav_item['label'] ); ?></a>
                                                <?php endforeach; ?>
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
                                        <nav class="main-menu" aria-label="<?php esc_attr_e( 'Navigation principale', 'customiizer' ); ?>">
                                                <ul class="main-menu__list">
                                                        <?php foreach ( $nav_items as $nav_item ) :
                                                                $link_classes = 'main-menu__link';
                                                                if ( $nav_item['is_active'] ) {
                                                                        $link_classes .= ' is-active';
                                                                }
                                                        ?>
                                                                <li class="main-menu__item">
                                                                        <a class="<?php echo esc_attr( $link_classes ); ?>" href="<?php echo esc_url( $nav_item['url'] ); ?>"<?php echo $nav_item['is_active'] ? ' aria-current="page"' : ''; ?>><?php echo esc_html( $nav_item['label'] ); ?></a>
                                                                </li>
                                                        <?php endforeach; ?>
                                                </ul>
                                        </nav>
                                </div>
				<div class="account-icons-container">

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
                <a href="<?php echo esc_url( wc_get_cart_url() ); ?>" id="cartButton" class="icon-button">
                        <i class="fas fa-shopping-bag"></i>
                        <span class="cart-text">Panier</span>
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
                <a href="<?php echo esc_url( wc_get_cart_url() ); ?>" id="cartButton" class="icon-button">
                        <i class="fas fa-shopping-bag"></i>
                        <span class="cart-text">Panier</span>
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

