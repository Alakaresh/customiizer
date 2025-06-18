<?php
/*
Template Name: Community
*/
get_header();
?>

<!DOCTYPE html>
<html lang="fr">
<head>
  <link rel="stylesheet" type="text/css" href="wp-content/themes/customiizer/styles/community.css">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" rel="stylesheet">

<script src="<?php echo get_stylesheet_directory_uri(); ?>/js/jquery-3.6.1.min.js"></script>
<meta charset="UTF-8">
</head>
<body>
<main id="site-content" class="site-content">
        <div id="community-loading" class="loading-overlay" style="display:flex;">
                <div class="loading-spinner"></div>
        </div>
<!-- IMAGES -->
        <div class="search-and-sort-container">
		<div class="sorting-container">
			<button id="sort-explore">Explore</button>
			<button id="sort-likes">Likes</button>
		</div>
		<div class="search-container">
			<input type="text" id="search-input" placeholder="Search...">
			<button id="search-button"><i class="fas fa-search"></i></button>
		</div>
	</div>
	<div class="content-container" id="image-container" style="width: 100%; height: auto">
		<div class="image-column" id="image-container1"></div>
	</div>
	<div id="imageModal" class="modal">
		<img class="modal-content" id="modalImage">
		<div id="caption"></div>
	</div>
</main>
<script src="/wp-content/themes/customiizer/js/community/show_images.js"></script>
</body>
</html>
