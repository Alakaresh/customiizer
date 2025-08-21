<?php
// Activer l'affichage des erreurs pour le débogage uniquement en mode developpement
if (defined('WP_DEBUG') && WP_DEBUG) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}

// Inclure WordPress pour accéder à ses fonctions
define('WP_USE_THEMES', false);
$wp_load_path = dirname(__FILE__) . '/../../../../../wp-load.php';
if (file_exists($wp_load_path)) {
    require_once($wp_load_path);
} else {
    customiizer_log('WEBHOOK_IMAGINE', get_current_user_id(), customiizer_session_id(), 'ERROR', "Erreur : wp-load.php introuvable.");
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'wp-load.php not found']);
    exit;
}

$userId    = get_current_user_id();
$sessionId = customiizer_session_id();

// Lire le corps de la requête JSON
$inputJSON = file_get_contents('php://input');
if ($inputJSON === false) {
    customiizer_log('WEBHOOK_IMAGINE', $userId, $sessionId, 'ERROR', "Erreur : Impossible de lire l'entrée JSON.");
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => "Impossible de lire l'entrée JSON."]);
    exit;
}

customiizer_log('WEBHOOK_IMAGINE', $userId, $sessionId, 'INFO', 'Payload brut: ' . substr($inputJSON, 0, 1000));

$input = json_decode($inputJSON, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    customiizer_log('WEBHOOK_IMAGINE', $userId, $sessionId, 'ERROR', "Erreur de décodage JSON: " . json_last_error_msg());
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'JSON mal formé.']);
    exit;
}

// Vérifier les données reçues
if (is_array($input) && !empty($input) && isset($input['hash'])) {
    $task_hash = sanitize_text_field($input['hash']);

    // Vérifier si un post avec ce hash existe déjà
    $args = array(
        'post_type' => 'image_task',
        'meta_query' => array(
            array(
                'key' => 'task_hash',
                'value' => $task_hash,
                'compare' => '='
            )
        )
    );

    $query = new WP_Query($args);

    if ($query->have_posts()) {
        $query->the_post();
        $post_id = get_the_ID();
    } else {
        customiizer_log('WEBHOOK_IMAGINE', $userId, $sessionId, 'INFO', "Aucun post existant trouvé pour le hash: $task_hash. Création d'un nouveau post.");
        
        // Créer un nouveau post pour cette tâche
        $post_data = array(
            'post_title' => $task_hash,
            'post_type' => 'image_task',
            'post_status' => 'publish',
        );
        $post_id = wp_insert_post($post_data);

        if (is_wp_error($post_id)) {
            customiizer_log('WEBHOOK_IMAGINE', $userId, $sessionId, 'ERROR', "Erreur lors de la création du post: " . $post_id->get_error_message());
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to create post']);
            exit;
        }
    }

    // Stocker les données complètes du webhook dans les méta-posts
    $update_result = update_post_meta($post_id, 'image_generation', $input);
    if (!$update_result) {
        customiizer_log('WEBHOOK_IMAGINE', $userId, $sessionId, 'ERROR', "Erreur lors de la mise à jour des métadonnées 'image_generation' pour le post ID: $post_id");
    } else {
        customiizer_log('WEBHOOK_IMAGINE', $userId, $sessionId, 'INFO', "Métadonnées 'image_generation' mises à jour pour le post ID: $post_id");
    }

    $update_result = update_post_meta($post_id, 'task_hash', $task_hash);
    if (!$update_result) {
        customiizer_log('WEBHOOK_IMAGINE', $userId, $sessionId, 'ERROR', "Erreur lors de la mise à jour des métadonnées 'task_hash' pour le post ID: $post_id");
    } else {
        customiizer_log('WEBHOOK_IMAGINE', $userId, $sessionId, 'INFO', "Métadonnées 'task_hash' mises à jour pour le post ID: $post_id");
    }

    // Répondre avec succès
    http_response_code(200);
    customiizer_log('WEBHOOK_IMAGINE', $userId, $sessionId, 'INFO', "Données traitées avec succès pour le post ID: $post_id");
    echo json_encode(['status' => 'success']);
} else {
    // Répondre avec une erreur si les données ne sont pas valides
    customiizer_log('WEBHOOK_IMAGINE', $userId, $sessionId, 'ERROR', "Structure de données invalide: " . print_r($input, true));
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Structure de données invalide']);
}
?>
