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
		<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css" rel="stylesheet">
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
						<a href="/home">
							<img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/full_logo.png" alt="Logo du site">
						</a>
					</div>

					<div class="mobile-menu-toggle" style="display: none;">
						<i class="fas fa-bars"></i>
					</div>

					<nav class="mobile-menu" style="display: none;">
						<a href="/customiize">Customiize</a>
						<a href="/boutique">Boutique</a>
						<a href="/communaute">Communauté</a>
						<a href="/compte?triggerClick=true" id="mobileMyCreationsLink">Mes créations</a>
					</nav>
					<!-- 🎯 Bloc Early Access sous le logo -->
					<?php
					$pages_autorisees = ['boutique', 'home']; 

					if (is_page($pages_autorisees) || is_front_page()):
					?>
					<div class="early-access-banner">
						🔥 <strong>Early Access</strong> – <span class="highlight">-30%</span> avec le code <strong>CUSTOM30</strong><br>
						<span class="version-info">Version 1.0.3</span>
					</div>
					<?php endif; ?>
				</div>
				<div class="menu-container">
					<nav class="main-menu">
						<div><a href="/customiize">Customiize</a></div>
						<div><a href="/boutique">Boutique</a></div>
						<div><a href="/communaute">Communauté</a></div>
						<div>
							<a href="/compte?triggerClick=true" id="myCreationsLink" data-redirect="compte?triggerClick=true">Mes créations</a>
						</div>
					</nav>
				</div>
				<div class="account-icons-container">

					<?php if ($user_logged_in): ?>
					<div class="image-credits-container">
						<i class="fas fa-coins"></i> Crédits: <span id="userCredits" class="image-credits-count">...</span>
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
					$base_url = get_site_url();
					$custom_image_path = "/wp-sauvegarde/user/$user_id/user_logo.png";
					$custom_image_full_path = $_SERVER['DOCUMENT_ROOT'] . $custom_image_path;
					$custom_image_url = $base_url . $custom_image_path;
					$profile_image_url = file_exists($custom_image_full_path) ? $custom_image_url : get_avatar_url($user_id);
        global $wpdb;
        $image_credits = intval($wpdb->get_var($wpdb->prepare("SELECT image_credits FROM WPC_users WHERE user_id = %d", $user_id)));
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
		<script type="text/javascript">
			var baseUrl = '<?php echo get_site_url(); ?>'; 
		</script>
		<script>
			var ajaxurl = '<?php echo esc_js(admin_url('admin-ajax.php')); ?>';
			var userIsLoggedIn = <?php echo $user_logged_in ? 'true' : 'false'; ?>;
			var currentUser = {
				ID: <?php echo $user_id; ?>,
				user_nicename: "<?php echo esc_js($user_nicename); ?>",
				display_name: "<?php echo esc_js($display_name); ?>"
			};
		</script>
		<script>
			jQuery(document).ready(function ($) {
				$('.mobile-menu-toggle').on('click', function () {
					$('.mobile-menu').toggleClass('active');
				});
			});

		</script>
                <script>
<?php if ($user_logged_in): ?>
                        (function(){
                                const essentials = {
                                        user_id: <?php echo intval($user_id); ?>,
                                        display_name: <?php echo json_encode($display_name); ?>,
                                        image_credits: <?php echo intval($image_credits); ?>,
                                        user_logo: <?php echo json_encode($profile_image_url); ?>
                                };
                                sessionStorage.setItem("USER_ESSENTIALS", JSON.stringify(essentials));
                                document.addEventListener("DOMContentLoaded", function(){
                                        const creditsEl = document.getElementById("userCredits");
                                        if (creditsEl) creditsEl.textContent = essentials.image_credits;
                                });
                        })();
<?php endif; ?>
                </script>
		<script>
			jQuery(document).ready(function($) {
				const myCreationsLink = $('#myCreationsLink');

				myCreationsLink.on('click', function(event) {
					if (!userIsLoggedIn) {
						event.preventDefault();
						console.log("🔒 Utilisateur non connecté, ouverture du modal de connexion...");

						// Stocke l’intention dans sessionStorage
						sessionStorage.setItem("redirectAfterLogin", "myCreations");

						$('#loginModal').fadeIn(300);
						return false;
					}
				});

			});
		</script>
		<script>
			jQuery(document).ready(function ($) {
				// ✅ Activer ou désactiver le blocage mobile ici
				const MOBILE_BLOCK_ENABLED = true;

				// ✅ Détection simple des smartphones (exclut tablettes)
				const isSmartphone = /Android.+Mobile|iPhone|iPod|Windows Phone/i.test(navigator.userAgent);

				if (MOBILE_BLOCK_ENABLED && isSmartphone) {
					$('body').html(`
			<div style="color: white; background-color: #111; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px;">
				<div>
					<h2>📱 Version mobile en cours de développement</h2>
					<p>La personnalisation de produits sera bientôt disponible sur smartphone.<br>
					Merci d’utiliser un ordinateur ou une tablette pour le moment.</p>
			</div>
			</div>
		`);
				}
			});

			window.addEventListener("load", function () {
				if (!window.currentUser || !currentUser.ID) {
					console.warn("⛔️ Aucun utilisateur connecté.");
					return;
				}

				const userId = currentUser.ID;

				// Références DOM
				const creditsEl = document.getElementById('userCredits');
				const nameEl = document.getElementById('userDisplayName');
				const logoEl = document.getElementById('userLogo');

				// Vérifie si les éléments existent avant de continuer
                                if (!creditsEl) {
                                        console.warn("⚠️ Élément #userCredits introuvable.");
                                } else {
                                        const cached = sessionStorage.getItem('USER_ESSENTIALS');
                                        let fromCache = false;
                                        if (cached) {
                                                const data = JSON.parse(cached);
                                                if (data.user_id === userId) {
                                                        creditsEl.textContent = data.image_credits;
                                                        if (nameEl) nameEl.textContent = data.display_name;
                                                        if (logoEl && data.user_logo) logoEl.src = data.user_logo;
                                                        fromCache = true;
                                                }
                                        }

                                        if (!fromCache) {
                                                // Récupère depuis l’API si pas trouvé dans le cache
                                                fetch(`/wp-json/api/v1/user/load?user_id=${userId}&include=display_name,image_credits,user_logo`, {
                                                        credentials: 'include'
                                                })
                                                        .then(res => res.json())
                                                        .then(data => {
                                                        if (data.success && data.data) {
                                                                const essentials = {
                                                                        user_id: userId,
                                                                        display_name: data.data.display_name,
                                                                        image_credits: data.data.image_credits,
                                                                        user_logo: data.data.user_logo
                                                                };
                                                                sessionStorage.setItem('USER_ESSENTIALS', JSON.stringify(essentials));

                                                                if (creditsEl) creditsEl.textContent = data.data.image_credits;
                                                                if (nameEl) nameEl.textContent = data.data.display_name;
                                                                if (logoEl && data.data.user_logo) logoEl.src = data.data.user_logo;
                                                        }
                                                });
                                        }
                                }
			});
		</script>
	</body>
</html>