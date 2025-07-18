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
               <!-- Styles moved to assets.php -->
	</head>
	<body>
		<main id="site-content" class="site-content">
			<div id="profile" class="profile">
				<?php get_template_part('templates/profile/sidebar'); ?>
				<div id="main-container" class="main-container">
				</div>
			</div>
                        <script>
                                if (typeof baseUrl === 'undefined') {
                                        var baseUrl = window.location.origin;
                                }
                                var ajaxurl = baseUrl + '/wp-admin/admin-ajax.php';
                        </script>
                       <!-- Scripts moved to assets.php -->
			
		</main>
	</body>
</html>

<?php
get_footer();
?>