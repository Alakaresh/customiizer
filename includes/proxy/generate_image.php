<?php
// Constantes pour les valeurs fixes
define('API_URL', 'https://api.userapi.ai/midjourney/v2/imagine');
define('API_KEY', '28e69054-9d20-453b-bdc9-79c2f86c027d');

// Limites configurées
define('MAX_PROMPT_LENGTH', 1000);
define('MAX_IMAGE_DIMENSION', 1024);
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

$inputJSON = file_get_contents('php://input');
$truncatedInput = substr($inputJSON, 0, 1000);
customiizer_log('proxy_generate_image', $userId, $sessionId, 'INFO', 'Réception requête', ['payload' => $truncatedInput], $requestId);
$input = json_decode($inputJSON, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    customiizer_log('proxy_generate_image', $userId, $sessionId, 'ERROR', 'Erreur JSON: ' . json_last_error_msg(), [], $requestId);
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'JSON mal formé.', 'requestId' => $requestId]);
    exit;
}

$prompt = isset($input['prompt']) ? sanitize_text_field($input['prompt']) : '';
if ($prompt === '' || mb_strlen($prompt) > MAX_PROMPT_LENGTH) {
    customiizer_log('proxy_generate_image', $userId, $sessionId, 'ERROR', 'Prompt invalide', ['length' => mb_strlen($prompt)], $requestId);
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Prompt invalide.', 'requestId' => $requestId]);
    exit;
}

$webhook_url = $input['webhook_url'] ?? null;
if ($webhook_url !== null) {
    $webhook_url = esc_url_raw($webhook_url);
    if ($webhook_url === '' || !filter_var($webhook_url, FILTER_VALIDATE_URL)) {
        customiizer_log('proxy_generate_image', $userId, $sessionId, 'ERROR', 'Webhook URL invalide', [], $requestId);
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Webhook URL invalide.', 'requestId' => $requestId]);
        exit;
    }
}

$webhook_type = $input['webhook_type'] ?? 'progress';
if (!in_array($webhook_type, ALLOWED_WEBHOOK_TYPES, true)) {
    customiizer_log('proxy_generate_image', $userId, $sessionId, 'ERROR', 'Webhook type invalide', ['webhook_type' => $webhook_type], $requestId);
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Webhook type invalide.', 'requestId' => $requestId]);
    exit;
}

$width = isset($input['width']) ? intval($input['width']) : null;
$height = isset($input['height']) ? intval($input['height']) : null;
if (($width && ($width <= 0 || $width > MAX_IMAGE_DIMENSION)) || ($height && ($height <= 0 || $height > MAX_IMAGE_DIMENSION))) {
    customiizer_log('proxy_generate_image', $userId, $sessionId, 'ERROR', 'Dimensions invalides', ['width' => $width, 'height' => $height], $requestId);
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Dimensions invalides.', 'requestId' => $requestId]);
    exit;
}

$data = [
    'prompt' => $prompt,
    'webhook_url' => $webhook_url,
    'webhook_type' => $webhook_type,
    'is_disable_prefilter' => !empty($input['is_disable_prefilter']),
];
if ($width && $height) {
    $data['width'] = $width;
    $data['height'] = $height;
}

customiizer_log('proxy_generate_image', $userId, $sessionId, 'INFO', "Appel API externe", ['payload' => $data], $requestId);

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
    customiizer_log('proxy_generate_image', $userId, $sessionId, 'ERROR', 'Erreur cURL: ' . $error, [], $requestId);
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Erreur de connexion à l\'API.', 'requestId' => $requestId]);
    curl_close($ch);
    exit;
}

curl_close($ch);

customiizer_log('proxy_generate_image', $userId, $sessionId, 'INFO', 'Réponse brute API: ' . substr($response, 0, 1000), [], $requestId);
$responseData = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    customiizer_log('proxy_generate_image', $userId, $sessionId, 'ERROR', 'Erreur JSON API: ' . json_last_error_msg(), [], $requestId);
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Réponse API invalide.', 'requestId' => $requestId]);
    exit;
}

if (isset($responseData['error'])) {
    customiizer_log('proxy_generate_image', $userId, $sessionId, 'ERROR', 'Erreur API: ' . $responseData['error'], [], $requestId);
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Erreur depuis l\'API.', 'details' => $responseData['error'], 'requestId' => $requestId]);
    exit;
}

customiizer_log('proxy_generate_image', $userId, $sessionId, 'INFO', 'Succès API', ['response' => $responseData], $requestId);
echo json_encode(['status' => 'success', 'data' => $responseData, 'requestId' => $requestId]);

?>