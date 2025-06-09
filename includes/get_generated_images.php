<?php
function get_generated_images2() {
    global $wpdb;
    $table_name = 'WPC_generated_image';

    // Récupérer toutes les images de la base de données
    $results = $wpdb->get_results("SELECT * FROM $table_name");

    // Vérification si des images sont trouvées
    if (!empty($results)) {
        // Envoyer une réponse JSON de succès avec les images
        wp_send_json_success(array(
            'images' => $results
        ));
    } else {
        // Si aucune image n'est trouvée, renvoyer une réponse JSON d'erreur
        wp_send_json_error(array(
            'message' => 'No images found'
        ));
    }

    // Terminer la requête pour éviter tout output supplémentaire
    wp_die();
}

add_action('wp_ajax_nopriv_get_generated_images', 'get_generated_images');
add_action('wp_ajax_get_generated_images', 'get_generated_images');
