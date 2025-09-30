<?php

require_once dirname(__DIR__, 5) . '/wp-load.php';
require_once dirname(__DIR__, 2) . '/utilities.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    customiizer_log('generate_image', 'Requête rejetée : méthode non autorisée (' . $_SERVER['REQUEST_METHOD'] . ')');
    http_response_code(405);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée.'
    ]);
    exit;
}

$rawInput = file_get_contents('php://input');
if ($rawInput === false) {
    $rawInput = '';
}
customiizer_log('generate_image', 'Requête brute reçue : ' . substr($rawInput, 0, 500));

$payload = json_decode($rawInput, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    customiizer_log('generate_image', 'Requête JSON invalide : ' . json_last_error_msg());
    http_response_code(400);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Requête JSON invalide.'
    ]);
    exit;
}

if (!is_user_logged_in()) {
    customiizer_log('generate_image', 'Requête refusée : utilisateur non authentifié');
    http_response_code(401);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Authentification requise.'
    ]);
    exit;
}

$prompt = isset($payload['prompt']) ? trim(wp_unslash($payload['prompt'])) : '';
$formatImage = isset($payload['format_image']) ? sanitize_text_field($payload['format_image']) : '';

if ($prompt === '') {
    customiizer_log('generate_image', 'Requête invalide : prompt manquant');
    http_response_code(400);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Le prompt est obligatoire.'
    ]);
    exit;
}

if ($formatImage === '') {
    customiizer_log('generate_image', "Requête invalide : format d'image manquant");
    http_response_code(400);
    echo wp_json_encode([
        'success' => false,
        'message' => "Le format de l'image est obligatoire."
    ]);
    exit;
}

$userId = get_current_user_id();
$taskId = uniqid('task_', true);

$promptLength = strlen($prompt);
$promptPreview = function_exists('mb_substr') ? mb_substr($prompt, 0, 120, 'UTF-8') : substr($prompt, 0, 120);
if ($promptLength > 120) {
    $promptPreview .= '…';
}

$logContextData = [
    'userId' => $userId,
    'taskId' => $taskId,
    'promptLength' => $promptLength,
    'promptPreview' => $promptPreview,
    'formatImage' => $formatImage,
];

customiizer_log('generate_image', 'Requête reçue (génération désactivée) : ' . wp_json_encode($logContextData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
customiizer_log('generate_image', sprintf('Aucune insertion en base ni envoi RabbitMQ pour la tâche %s', $taskId));

echo wp_json_encode([
    'success' => true,
    'taskId' => $taskId,
    'status' => 'disabled',
    'message' => 'La génération automatique est temporairement désactivée.'
]);
exit;
