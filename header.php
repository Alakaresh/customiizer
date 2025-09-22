<?php
/*
Template Name: Header
*/

if ( ! defined( 'ABSPATH' ) ) {
        exit; // Exit if accessed directly.
}

$current_user     = wp_get_current_user();
$user_logged_in   = is_user_logged_in();
$user_id          = $current_user->ID;
$user_nicename    = $current_user->user_nicename;
$display_name     = $current_user->display_name;
$loyalty_points   = function_exists( 'customiizer_get_loyalty_points' ) ? customiizer_get_loyalty_points( $user_id ) : 0;
$loyalty_icon_url = get_stylesheet_directory_uri() . '/images/customiizerSiteImages/customPoint.png';

$primary_navigation_items = [
        [
                'label' => esc_html__( 'Boutique', 'customiizer' ),
                'url'   => home_url( '/boutique' ),
                'slug'  => 'boutique',
        ],
        [
                'label' => esc_html__( 'Customiize', 'customiizer' ),
                'url'   => home_url( '/customiize' ),
                'slug'  => 'customiize',
        ],
        [
                'label' => esc_html__( 'Communauté', 'customiizer' ),
                'url'   => home_url( '/communaute' ),
                'slug'  => 'communaute',
        ],
];

$is_navigation_item_active = static function ( $slug ) {
        if ( empty( $slug ) ) {
                return false;
        }

        if ( 'boutique' === $slug && function_exists( 'is_shop' ) && is_shop() ) {
                return true;
        }

        return is_page( $slug );
};

$pages_autorisees = [ 'boutique', 'home' ];
$show_early_access = is_page( $pages_autorisees ) || is_front_page();
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
                <header id="header" class="site-header" role="banner">
                        <div class="header-shell">
                                <?php if ( $show_early_access ) : ?>
                                <div class="header-top" role="note">
                                        <div class="header-top-announcement">
                                                <span class="announcement-pill"><?php esc_html_e( 'Early Access', 'customiizer' ); ?></span>
                                                <span class="announcement-text"><?php esc_html_e( 'Profitez de -30% avec le code', 'customiizer' ); ?> <span class="announcement-code">CUSTOM30</span></span>
                                        </div>
                                        <div class="header-top-meta">
                                                <span class="header-version-label"><?php esc_html_e( 'Version', 'customiizer' ); ?></span>
                                                <span class="header-version-value"><?php echo esc_html( customiizer_frontend_version() ); ?></span>
                                        </div>
                                </div>
                                <?php endif; ?>

                                <div class="header-main">
                                        <div class="brand-block">
                                                <button class="mobile-menu-toggle" type="button" aria-expanded="false" aria-controls="mobileMenu" aria-label="<?php echo esc_attr__( 'Afficher le menu', 'customiizer' ); ?>">
                                                        <span class="sr-only"><?php echo esc_html__( 'Basculer le menu', 'customiizer' ); ?></span>
                                                        <span class="menu-icon" aria-hidden="true">
                                                                <span></span>
                                                                <span></span>
                                                                <span></span>
                                                        </span>
                                                </button>

                                                <div class="logo">
                                                        <a class="brand-logo" href="<?php echo esc_url( home_url( '/home' ) ); ?>">
                                                                <img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/full_logo.png" alt="<?php echo esc_attr__( 'Customiizer', 'customiizer' ); ?>">
                                                        </a>
                                                </div>
                                        </div>

                                        <nav class="main-navigation" aria-label="<?php echo esc_attr__( 'Navigation principale', 'customiizer' ); ?>">
                                                <ul class="main-menu">
                                                        <?php foreach ( $primary_navigation_items as $item ) : ?>
                                                                <li class="main-menu-item<?php echo $is_navigation_item_active( $item['slug'] ) ? ' is-current' : ''; ?>">
                                                                        <a href="<?php echo esc_url( $item['url'] ); ?>">
                                                                                <span><?php echo esc_html( $item['label'] ); ?></span>
                                                                        </a>
                                                                </li>
                                                        <?php endforeach; ?>
                                                </ul>
                                        </nav>

                                        <div class="account-icons-container header-actions">
                                                <div class="loyalty-header-container">
                                                        <button id="loyalty-widget-button" class="loyalty-widget-button" type="button">
                                                                <i class="fas fa-gift" aria-hidden="true"></i>
                                                                <span class="loyalty-button-text"><?php echo esc_html__( 'Mes avantages', 'customiizer' ); ?></span>
                                                        </button>
                                                        <?php if ( $user_logged_in ) : ?>
                                                        <span class="loyalty-header-points">
                                                                <?php echo esc_html( sprintf( __( '%d custompoints', 'customiizer' ), intval( $loyalty_points ) ) ); ?>
                                                                <img src="<?php echo esc_url( $loyalty_icon_url ); ?>" alt="<?php echo esc_attr__( 'Custompoints', 'customiizer' ); ?>" />
                                                        </span>
                                                        <?php else : ?>
                                                        <span class="loyalty-header-points loyalty-header-hint"><?php echo esc_html__( 'Cumulez des points à chaque achat', 'customiizer' ); ?></span>
                                                        <?php endif; ?>
                                                </div>

                                                <?php if ( $user_logged_in ) : ?>
                                                        <?php $profile_image_url = customiizer_get_profile_image_url( $user_id ); ?>
                                                        <?php if ( class_exists( 'WooCommerce' ) ) : ?>
                                                                <div class="cart-container">
                                                                        <a href="<?php echo esc_url( wc_get_cart_url() ); ?>" id="cartButton" class="header-action">
                                                                                <span class="header-action-icon" aria-hidden="true"><i class="fas fa-shopping-bag"></i></span>
                                                                                <span class="header-action-label"><?php echo esc_html__( 'Panier', 'customiizer' ); ?></span>
                                                                                <?php $count = WC()->cart->get_cart_contents_count(); ?>
                                                                                <?php if ( $count > 0 ) : ?>
                                                                                        <span class="cart-count"><?php echo esc_html( $count ); ?></span>
                                                                                <?php endif; ?>
                                                                        </a>
                                                                </div>
                                                        <?php endif; ?>
                                                        <div class="profile-container">
                                                                <a id="profileLink" class="header-avatar">
                                                                        <img src="<?php echo esc_url( $profile_image_url ); ?>" alt="<?php echo esc_attr( $display_name ); ?>" class="user-profile-image">
                                                                </a>
                                                        </div>
                                                <?php else : ?>
                                                        <?php if ( class_exists( 'WooCommerce' ) ) : ?>
                                                                <div class="cart-container">
                                                                        <a href="<?php echo esc_url( wc_get_cart_url() ); ?>" id="cartButton" class="header-action">
                                                                                <span class="header-action-icon" aria-hidden="true"><i class="fas fa-shopping-bag"></i></span>
                                                                                <span class="header-action-label"><?php echo esc_html__( 'Panier', 'customiizer' ); ?></span>
                                                                                <?php $count = WC()->cart->get_cart_contents_count(); ?>
                                                                                <?php if ( $count > 0 ) : ?>
                                                                                        <span class="cart-count"><?php echo esc_html( $count ); ?></span>
                                                                                <?php endif; ?>
                                                                        </a>
                                                                </div>
                                                        <?php endif; ?>
                                                        <div class="login-register-container">
                                                                <a id="loginRegisterButton" class="header-action">
                                                                        <span class="header-action-icon" aria-hidden="true"><i class="fas fa-user"></i></span>
                                                                        <span class="header-action-label"><?php echo esc_html__( 'Se connecter', 'customiizer' ); ?></span>
                                                                </a>
                                                        </div>
                                                <?php endif; ?>
                                        </div>
                                </div>

                                <nav class="mobile-menu" id="mobileMenu" aria-label="<?php echo esc_attr__( 'Navigation mobile', 'customiizer' ); ?>" aria-hidden="true">
                                        <ul>
                                                <?php foreach ( $primary_navigation_items as $item ) : ?>
                                                        <li class="mobile-menu-item<?php echo $is_navigation_item_active( $item['slug'] ) ? ' is-current' : ''; ?>">
                                                                <a href="<?php echo esc_url( $item['url'] ); ?>"><?php echo esc_html( $item['label'] ); ?></a>
                                                        </li>
                                                <?php endforeach; ?>
                                        </ul>
                                </nav>
                        </div>
               </header>

<?php
if ( function_exists( 'customiizer_loyalty_widget' ) ) {
        customiizer_loyalty_widget();
}
?>

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

