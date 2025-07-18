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
						<div>
							<a href="account?triggerClick=true" class="ajax-link" id="myCreationsLink" data-redirect="account?triggerClick=true">Mes créations</a>
						</div>
					</nav>
				</div>
				<div class="account-icons-container">

					<?php if ($user_logged_in): ?>
                                        <div class="image-credits-container" title="Ces crédits servent à générer des images IA (1 crédit = 1 image)">
                                                <i class="fas fa-coins"></i> Crédits: <span class="image-credits-count">Chargement...</span>
                                        </div>
					<?php endif; ?>

					<?php if (class_exists('WooCommerce')): ?>
					<div class="cart-container">
						<a href="<?php echo wc_get_cart_url(); ?>" class="icon-button">
							<i class="fas fa-shopping-bag"></i>
							<span class="cart-text">Panier</span>
							<?php $count = WC()->cart->get_cart_contents_count(); ?>
							<?php if ($count > 0): ?>
							<span class="cart-count"><?php echo esc_html($count); ?></span>
							<?php endif; ?>
						</a>
					</div>
					<?php endif; ?>

					<?php if ($user_logged_in): ?>
					<?php
                                        $profile_image_url = customiizer_get_profile_image_url($user_id);
					?>
					<div class="profile-container">
						<a id="profileLink" class="icon-button">
							<img src="<?php echo esc_url($profile_image_url); ?>" alt="Profile Image" class="user-profile-image">
						</a>
					</div>
					<?php else: ?>
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