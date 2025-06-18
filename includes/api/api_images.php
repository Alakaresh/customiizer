<?php
add_action('rest_api_init', function() {
    // Endpoint pour récupérer toutes les images générées
    register_rest_route('custom-api/v1', '/generated-images/', array(
        'methods' => 'GET',
        'callback' => 'get_generated_images',
        'permission_callback' => 'customiizer_api_permissions' // API ouverte à tous, peut être restreinte
    ));
});

/**
 * Récupérer toutes les images générées avec pagination et filtres
 */
function get_generated_images($request) {
    global $wpdb;
    $prefix = 'WPC_'; // Préfixe de la base de données

    // Filtres dynamiques
    $customer_id = isset($_GET['customer_id']) ? intval($_GET['customer_id']) : null;
    $format_image = isset($_GET['format_image']) ? sanitize_text_field($_GET['format_image']) : null;
    $date_from = isset($_GET['date_from']) ? sanitize_text_field($_GET['date_from']) : null;
    $date_to = isset($_GET['date_to']) ? sanitize_text_field($_GET['date_to']) : null;
	$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;

    // Construction de la requête SQL
    $query = "SELECT image_number, customer_id, user_login, upscaled_id, source_id, image_date, 
                     image_prefix, image_url, picture_likes_nb, format_image, prompt, settings
              FROM {$prefix}generated_image
              WHERE 1=1";

    // Ajout des filtres dynamiques
    if ($customer_id) {
        $query .= " AND customer_id = $customer_id";
    }
    if ($format_image) {
        $query .= $wpdb->prepare(" AND format_image = %s", $format_image);
    }
    if ($date_from && $date_to) {
        $query .= $wpdb->prepare(" AND image_date BETWEEN %s AND %s", $date_from, $date_to);
    }
	
	if ($customer_id) {
        $query .= " ORDER BY image_date DESC"; // Récupérer les plus récentes d'abord
    } else {
        $query .= " ORDER BY RAND() LIMIT $limit"; // 100 images aléatoires si pas de `customer_id`
    }
	
    // Exécution de la requête
    $results = $wpdb->get_results($query, ARRAY_A);

    // Si aucune image n'est trouvée
    if (empty($results)) {
        return new WP_REST_Response(['error' => 'Aucune image trouvée'], 404);
    }

    return new WP_REST_Response(['success' => true, 'images' => $results], 200);
}