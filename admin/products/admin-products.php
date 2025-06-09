<?php
add_action('admin_menu', function () {
	add_menu_page(
		'Gestion Produits Customiizer', // Titre de la page
		'Custom Produits',         // Nom du menu visible
		'manage_options',
		'customiizer_product_manager',
		'render_product_manager_page',
		'dashicons-admin-generic',     // Icône au choix
		3                             // Position (évite les conflits)
	);

});

function render_product_manager_page() {
	echo '<div class="wrap"><h1>🛍️ Gestion des Produits</h1>';
	echo '<div id="customiizer-product-admin-root"></div></div>';
	echo '<script type="module" src="' . get_stylesheet_directory_uri() . '/admin/products/js/products-admin.js"></script>';
}
