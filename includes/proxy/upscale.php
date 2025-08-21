<?php
// Constantes pour les valeurs fixes
define('API_URL', 'https://api.userapi.ai/midjourney/v2/upscale');
define('API_KEY', '28e69054-9d20-453b-bdc9-79c2f86c027d');

define('ALLOWED_WEBHOOK_TYPES', ['progress', 'result']);

// Charger WordPress et les utilitaires
$wp_load_path = dirname(__FILE__) . '/../../../../../wp-load.php';
if (file_exists($wp_load_path)) {
        require_once $wp_load_path;
}
require_once __DIR__ . '/../../utilities.php';

$userId    = get_current_user_id();
$sessionId = customiizer_session_id();
$requestId = wp_generate_uuid4();

// Lire le corps de la requête JSON
$inputJSON = file_get_contents('php://input');
customiizer_log('proxy_upscale', $userId, $sessionId, 'INFO', 'Réception requête', ['payload' => substr($inputJSON, 0, 1000)], $requestId);

$input = json_decode($inputJSON, true);

if (json_last_error() !== JSON_ERROR_NONE) {
        customiizer_log('proxy_upscale', $userId, $sessionId, 'ERROR', 'Erreur JSON: ' . json_last_error_msg(), [], $requestId);
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'JSON mal formé.', 'requestId' => $requestId]);
        exit;
}

// Vérification des données reçues
$hash = isset($input['hash']) ? sanitize_text_field($input['hash']) : '';
$choice = isset($input['choice']) ? intval($input['choice']) : 0;
$webhook_url = $input['webhook_url'] ?? null;
$webhook_type = $input['webhook_type'] ?? 'progress';

if ($hash === '' || $choice < 1 || $choice > 4 || $webhook_url === null || $webhook_type === null) {
        customiizer_log('proxy_upscale', $userId, $sessionId, 'ERROR', 'Paramètres manquants ou invalides', [], $requestId);
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Paramètres manquants ou invalides.', 'requestId' => $requestId]);
        exit;
}

$webhook_url = esc_url_raw($webhook_url);
if ($webhook_url === '' || !filter_var($webhook_url, FILTER_VALIDATE_URL)) {
        customiizer_log('proxy_upscale', $userId, $sessionId, 'ERROR', 'Webhook URL invalide', [], $requestId);
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Webhook URL invalide.', 'requestId' => $requestId]);
        exit;
}

if (!in_array($webhook_type, ALLOWED_WEBHOOK_TYPES, true)) {
        customiizer_log('proxy_upscale', $userId, $sessionId, 'ERROR', 'Webhook type invalide', ['webhook_type' => $webhook_type], $requestId);
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Webhook type invalide.', 'requestId' => $requestId]);
        exit;
}

// Préparer les données pour l'API externe
$data = [
        'hash' => $hash,
        'choice' => $choice,
        'webhook_url' => $webhook_url,
        'webhook_type' => $webhook_type,
];

customiizer_log('proxy_upscale', $userId, $sessionId, 'INFO', 'Appel API externe', ['payload' => $data], $requestId);

// Initialiser une session cURL
$ch = curl_init(API_URL);

// Configurer les options de cURL pour la requête POST
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'api-key: ' . API_KEY
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

// Exécuter la requête cURL
$response = curl_exec($ch);

if ($response === false) {
        customiizer_log('proxy_upscale', $userId, $sessionId, 'ERROR', 'Erreur cURL: ' . curl_error($ch), [], $requestId);
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de la requête externe.', 'requestId' => $requestId]);
        curl_close($ch);
        exit;
}

curl_close($ch);

// Traiter la réponse de l'API externe
$responseData = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
        customiizer_log('proxy_upscale', $userId, $sessionId, 'ERROR', 'Erreur JSON dans la réponse: ' . json_last_error_msg(), [], $requestId);
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Réponse JSON mal formée de l\'API externe.', 'requestId' => $requestId]);
        exit;
}

customiizer_log('proxy_upscale', $userId, $sessionId, 'INFO', 'Réponse de l\'API externe: ' . substr(print_r($responseData, true),0,1000), [], $requestId);

// Retourner la réponse à l'appelant original
http_response_code(200);
echo json_encode(['status' => 'success', 'data' => $responseData, 'requestId' => $requestId]);
