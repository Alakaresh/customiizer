<?php
/*
Template Name: Header
*/

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

get_template_part('templates/modal', 'login');
get_template_part('templates/modal', 'user');

$current_user = wp_get_current_user();
$user_logged_in = is_user_logged_in();
$user_id = $current_user->ID;
$user_nicename = $current_user->user_nicename;
$display_name = $current_user->display_name;
$advantages = array(
        'points'         => 0,
        'mission_points' => 0,
        'referrals'      => 0,
        'referral_link'  => '',
);

if ( $user_logged_in && function_exists( 'customiizer_get_user_advantages_summary' ) ) {
        $advantages = customiizer_get_user_advantages_summary( $user_id );
}

$advantages_json = wp_json_encode( $advantages );
if ( false === $advantages_json ) {
        $advantages_json = '{}';
}

$loyalty_title_parts = array(
        sprintf(
                /* translators: %s: formatted number of loyalty points */
                esc_html__( 'Custompoints : %s', 'customiizer' ),
                number_format_i18n( intval( $advantages['points'] ) )
        ),
);

if ( ! empty( $advantages['mission_points'] ) ) {
        $loyalty_title_parts[] = sprintf(
                /* translators: %s: formatted number of points earned via missions */
                esc_html__( 'Points missions : %s', 'customiizer' ),
                number_format_i18n( intval( $advantages['mission_points'] ) )
        );
}

if ( ! empty( $advantages['referrals'] ) ) {
        $loyalty_title_parts[] = sprintf(
                /* translators: %s: formatted number of referrals */
                esc_html__( 'Parrainages validés : %s', 'customiizer' ),
                number_format_i18n( intval( $advantages['referrals'] ) )
        );
}

$loyalty_title = implode( ' • ', array_filter( $loyalty_title_parts ) );
?>

<!DOCTYPE html>
<html <?php language_attributes(); ?>>
	<head>
		<meta charset="<?php bloginfo('charset'); ?>">
		<meta name="viewport" content="width=device-width, initial-scale=1">
               <!-- Style moved to assets.php -->
               <!-- Font Awesome moved to assets.php -->
		<?php wp_head(); ?>
		<style>
			@media (min-width: 1300px) {
				.logo-container img {
					content: url('<?php echo esc_url(get_stylesheet_directory_uri()); ?>/assets/img/full_logo.png');
				}
			}
			@media (max-width: 1300px) {
				.logo-container img {
					content: url('<?php echo esc_url(get_stylesheet_directory_uri()); ?>/assets/img/logo.png');
				}
			}
		</style>
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
				</div>
                                <div class="menu-container">
                                        <nav class="main-menu">
                                                <div><a href="/customiize" class="ajax-link">Customiize</a></div>
                                                <div><a href="/boutique" class="ajax-link">Boutique</a></div>
                                                <div><a href="/communaute" class="ajax-link">Communauté</a></div>
                                        </nav>
                                </div>
				<div class="account-icons-container">

        <?php if ($user_logged_in): ?>
        <?php
        $profile_image_url = customiizer_get_profile_image_url($user_id);
        ?>
        <?php if (class_exists('WooCommerce')): ?>
        <div class="cart-container">
                <a href="<?php echo esc_url( wc_get_cart_url() ); ?>" class="icon-button">
                        <i class="fas fa-shopping-bag"></i>
                        <span class="cart-text">Panier</span>
                        <?php $count = WC()->cart->get_cart_contents_count(); ?>
                        <?php if ($count > 0): ?>
                        <span class="cart-count"><?php echo esc_html($count); ?></span>
                        <?php endif; ?>
                </a>
        </div>
        <?php endif; ?>
        <a class="loyalty-header-container" href="<?php echo esc_url( home_url( '/compte?tab=loyalty' ) ); ?>" data-advantages="<?php echo esc_attr( $advantages_json ); ?>" title="<?php echo esc_attr( $loyalty_title ); ?>">
                <span class="loyalty-header-label"><?php echo esc_html__( 'Mes avantages', 'customiizer' ); ?></span>
                <span class="loyalty-header-points">
                        <span class="loyalty-header-balance"><?php echo esc_html( number_format_i18n( intval( $advantages['points'] ) ) ); ?></span>
                        <img src="<?php echo esc_url( get_stylesheet_directory_uri() . '/images/customiizerSiteImages/customPoint.png' ); ?>" alt="<?php echo esc_attr__( 'Custompoints', 'customiizer' ); ?>">
                </span>
                <?php if ( ! empty( $advantages['mission_points'] ) ) : ?>
                        <?php
                        $mission_text = sprintf(
                                /* translators: %s: number of mission points */
                                esc_html__( '%s pts missions', 'customiizer' ),
                                number_format_i18n( intval( $advantages['mission_points'] ) )
                        );
                        ?>
                        <span class="loyalty-header-meta"><?php echo esc_html( $mission_text ); ?></span>
                <?php endif; ?>
                <?php if ( ! empty( $advantages['referrals'] ) ) : ?>
                        <?php
                        $referral_text = sprintf(
                                /* translators: 1: number of referrals */
                                _n( '%s parrainage validé', '%s parrainages validés', intval( $advantages['referrals'] ), 'customiizer' ),
                                number_format_i18n( intval( $advantages['referrals'] ) )
                        );
                        ?>
                        <span class="loyalty-header-meta"><?php echo esc_html( $referral_text ); ?></span>
                <?php endif; ?>
        </a>
        <div class="profile-container">
                <a id="profileLink" class="icon-button">
                        <img src="<?php echo esc_url($profile_image_url); ?>" alt="Profile Image" class="user-profile-image">
                </a>
        </div>
        <?php else: ?>
        <?php if (class_exists('WooCommerce')): ?>
        <div class="cart-container">
                <a href="<?php echo esc_url( wc_get_cart_url() ); ?>" class="icon-button">
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
                        window.userAdvantages = window.userAdvantages || <?php echo $advantages_json; ?>;
                        if (typeof currentUser === 'object') {
                                currentUser.advantages = window.userAdvantages;
                        }
                </script>
        </body>
</html>
