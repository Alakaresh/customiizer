<?php
function get_all_generated_images() {
    global $wpdb;
    $table_name = 'WPC_generated_image';

    // Vérifier si un ID utilisateur est passé dans la requête
    $user = isset($_POST['user']) ? $_POST['user'] : false;
	
    if ($user) {
		$current_user_id = get_current_user_id();
        // Requête pour obtenir les images de l'utilisateur spécifique
        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_name WHERE customer_id = %d",
            $current_user_id
        ));
    } else {
        // Requête pour obtenir toutes les images
        $results = $wpdb->get_results("SELECT * FROM $table_name");
    }
	
    // Envoyer les résultats sous forme de JSON
    if (!empty($results)) {
        wp_send_json($results);
    } else {
        wp_send_json_error('No images found');
    }
	
	// Just in case, ensure nothing else is output
    wp_die();
}

add_action('wp_ajax_nopriv_get_all_generated_images', 'get_all_generated_images');
add_action('wp_ajax_get_all_generated_images', 'get_all_generated_images');
