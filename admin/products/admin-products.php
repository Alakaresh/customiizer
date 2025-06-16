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
        $enabled = get_option('customiizer_position_editor', false);
        echo '<div class="wrap"><h1>🛍️ Gestion des Produits</h1>';
        echo '<label style="margin-bottom:10px; display:block;"><input type="checkbox" id="position-editor-toggle" '.($enabled? 'checked':'').'/> Activer l\'éditeur de position</label>';
        echo '<div id="customiizer-product-admin-root"></div></div>';
        echo '<script type="module" src="' . get_stylesheet_directory_uri() . '/admin/products/js/products-admin.js"></script>';
        echo '<script>const positionEditorEnabled='.($enabled? 'true':'false').';</script>';
}

add_action('wp_ajax_customiizer_set_position_editor', function () {
        if (!current_user_can('manage_options')) wp_send_json_error('Non autorisé');
        $enabled = !empty($_POST['enabled']);
        update_option('customiizer_position_editor', $enabled ? 1 : 0);
        wp_send_json_success(['enabled' => $enabled]);
});
