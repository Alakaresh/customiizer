<?php
/*
Template Name: Account
*/
get_header();
?>

<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<link rel="stylesheet" type="text/css" href="<?php echo get_stylesheet_directory_uri(); ?>/styles/style.css">
		<link rel="stylesheet" type="text/css" href="<?php echo get_stylesheet_directory_uri(); ?>/styles/dashboard.css">
		<link rel="stylesheet" type="text/css" href="<?php echo get_stylesheet_directory_uri(); ?>/styles/account.css">

		<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/cropperjs@1.5.12/dist/cropper.min.css">
	</head>
	<body>
		<main id="site-content" class="site-content">
			<div id="profile" class="profile">
				<?php get_template_part('templates/profile/sidebar'); ?>
				<div id="main-container" class="main-container">
				</div>
			</div>
			<script>
				var ajaxurl = '<?php echo esc_js(admin_url('admin-ajax.php')); ?>';
			</script>
			<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
			<script src="https://cdn.jsdelivr.net/npm/cropperjs@1.5.12/dist/cropper.min.js"></script>
			
			<script src="/wp-content/themes/customiizer/js/account/sidebar.js"></script>
			<script src="/wp-content/themes/customiizer/js/account/dashboard.js"></script>
			<script src="/wp-content/themes/customiizer/js/account/purchases.js"></script>
			<script src="/wp-content/themes/customiizer/js/account/profile.js"></script>
			
		</main>
	</body>
</html>

<?php
get_footer();
?>