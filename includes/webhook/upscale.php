<?php
// Activer l'affichage des erreurs pour le débogage
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Inclure WordPress pour accéder à ses fonctions
define('WP_USE_THEMES', false);
$wp_load_path = dirname(__FILE__) . '/../../../../../wp-load.php';
if (file_exists($wp_load_path)) {
    require_once($wp_load_path);
} else {
    customiizer_log('WEBHOOK_UPSCALE', get_current_user_id(), customiizer_session_id(), 'ERROR', "Erreur : wp-load.php introuvable.");
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'wp-load.php not found']);
    exit;
}

$userId    = get_current_user_id();
$sessionId = customiizer_session_id();

// Lire le corps de la requête JSON
$inputJSON = file_get_contents('php://input');
if ($inputJSON === false) {
    customiizer_log('WEBHOOK_UPSCALE', $userId, $sessionId, 'ERROR', "Erreur : Impossible de lire l'entrée JSON.");
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => "Impossible de lire l'entrée JSON."]);
    exit;
}

$input = json_decode($inputJSON, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    customiizer_log('WEBHOOK_UPSCALE', $userId, $sessionId, 'ERROR', "Erreur JSON: " . json_last_error_msg());
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'JSON mal formé.']);
    exit;
}

// Traitement des données reçues
if (!isset($input['status']) || !isset($input['result']) || !isset($input['choice']) || !isset($input['hash'])) {
    customiizer_log('WEBHOOK_UPSCALE', $userId, $sessionId, 'ERROR', "Données manquantes dans la requête.");
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Données manquantes dans la requête.']);
    exit;
}

$image_url = $input['result']['url'];
$image_choice = $input['choice'];
$image_id = $input['hash'];

// Vérifier l'existence d'un post avec le même hash
$args = array(
    'post_type' => 'image_task',
    'meta_query' => array(
        array(
            'key' => 'task_hash',
            'value' => $image_id,
            'compare' => '='
        )
    )
);

$query = new WP_Query($args);

if ($query->have_posts()) {
    $query->the_post();
    $post_id = get_the_ID();
    wp_reset_postdata();
} else {
    // Créer un nouveau post si aucun post n'existe avec ce hash
    $post_id = wp_insert_post(array(
        'post_title' => $image_id,
        'post_type' => 'image_task',
        'post_status' => 'publish',
    ));

    if (is_wp_error($post_id)) {
        customiizer_log('WEBHOOK_UPSCALE', $userId, $sessionId, 'ERROR', "Erreur lors de la création du post: " . $post_id->get_error_message());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to create post']);
        exit;
    }
}

// Stocker les données complètes du webhook dans les méta-posts
update_post_meta($post_id, "image_choice_$image_choice", $image_url);
update_post_meta($post_id, 'task_hash', $image_id);

// Répondre avec succès
http_response_code(200);
echo json_encode(['status' => 'success', 'message' => 'Données traitées avec succès.']);
?>

