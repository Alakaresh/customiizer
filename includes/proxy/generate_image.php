<?php
// Constantes pour les valeurs fixes
define('API_URL', 'https://api.userapi.ai/midjourney/v2/imagine');
define('API_KEY', '28e69054-9d20-453b-bdc9-79c2f86c027d');

// Charger WordPress et les utilitaires
$wp_load_path = dirname(__FILE__) . '/../../../../../wp-load.php';
if (file_exists($wp_load_path)) {
    require_once $wp_load_path;
}
require_once __DIR__ . '/../../utilities.php';

$userId    = get_current_user_id();
$sessionId = customiizer_session_id();

$inputJSON = file_get_contents('php://input');
$truncatedInput = substr($inputJSON, 0, 1000);
customiizer_log('proxy_generate_image', $userId, $sessionId, 'INFO', "Payload reçu: $truncatedInput");
$input = json_decode($inputJSON, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    customiizer_log('proxy_generate_image', $userId, $sessionId, 'ERROR', "Erreur JSON: " . json_last_error_msg());
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'JSON mal formé.']);
    exit;
}

if (isset($input['prompt']) && !empty($input['prompt'])) {
    $data = [
        'prompt' => $input['prompt'],
        'webhook_url' => $input['webhook_url'] ?? null,
        'webhook_type' => $input['webhook_type'] ?? 'progress',
        'is_disable_prefilter' => $input['is_disable_prefilter'] ?? false,
    ];

    customiizer_log('proxy_generate_image', $userId, $sessionId, 'INFO', 'Données envoyées à l\'API: ' . json_encode($data));

    $ch = curl_init(API_URL);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'api-key: ' . API_KEY,
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

    $response = curl_exec($ch);

    if ($response === false) {
        $error = curl_error($ch);
        customiizer_log('proxy_generate_image', $userId, $sessionId, 'ERROR', "Erreur cURL: $error");
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erreur de connexion à l\'API.']);
        curl_close($ch);
        exit;
    }

    curl_close($ch);

    customiizer_log('proxy_generate_image', $userId, $sessionId, 'INFO', 'Réponse brute API: ' . substr($response, 0, 1000));
    $responseData = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        customiizer_log('proxy_generate_image', $userId, $sessionId, 'ERROR', "Erreur JSON API: " . json_last_error_msg());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Réponse API invalide.']);
        exit;
    }

    if (isset($responseData['error'])) {
        customiizer_log('proxy_generate_image', $userId, $sessionId, 'ERROR', "Erreur API: " . $responseData['error']);
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erreur depuis l\'API.', 'details' => $responseData['error']]);
        exit;
    }

    customiizer_log('proxy_generate_image', $userId, $sessionId, 'INFO', "Succès API: " . json_encode($responseData));
    echo json_encode(['status' => 'success', 'data' => $responseData]);
} else {
    customiizer_log('proxy_generate_image', $userId, $sessionId, 'ERROR', "Prompt manquant");
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Prompt manquant.']);
}
?>