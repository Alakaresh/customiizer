<?php
// Constantes pour les valeurs fixes
define('API_URL', 'https://api.userapi.ai/midjourney/v2/upscale');
define('API_KEY', '28e69054-9d20-453b-bdc9-79c2f86c027d');

// Charger WordPress et les utilitaires
$wp_load_path = dirname(__FILE__) . '/../../../../../wp-load.php';
if (file_exists($wp_load_path)) {
        require_once $wp_load_path;
}
require_once __DIR__ . '/../../utilities.php';

$userId    = get_current_user_id();
$sessionId = customiizer_session_id();

// Lire le corps de la requête JSON
$inputJSON = file_get_contents('php://input');
customiizer_log('proxy_upscale', $userId, $sessionId, 'INFO', "Reçu JSON: $inputJSON");

$input = json_decode($inputJSON, true);

if (json_last_error() !== JSON_ERROR_NONE) {
        customiizer_log('proxy_upscale', $userId, $sessionId, 'ERROR', "Erreur JSON: " . json_last_error_msg());
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'JSON mal formé.']);
        exit;
}

// Vérification des données reçues
if (!isset($input['hash']) || !isset($input['choice']) || !isset($input['webhook_url']) || !isset($input['webhook_type'])) {
        customiizer_log('proxy_upscale', $userId, $sessionId, 'ERROR', "Données manquantes dans la requête.");
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Données manquantes dans la requête.']);
        exit;
}

// Préparer les données pour l'API externe
$data = [
	'hash' => $input['hash'],
	'choice' => $input['choice'],
	'webhook_url' => $input['webhook_url'],
	'webhook_type' => $input['webhook_type'],
];

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
        customiizer_log('proxy_upscale', $userId, $sessionId, 'ERROR', "Erreur cURL: " . curl_error($ch));
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erreur lors de la requête externe.']);
        curl_close($ch);
        exit;
}

curl_close($ch);

// Traiter la réponse de l'API externe
$responseData = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
        customiizer_log('proxy_upscale', $userId, $sessionId, 'ERROR', "Erreur JSON dans la réponse: " . json_last_error_msg());
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Réponse JSON mal formée de l\'API externe.']);
        exit;
}

customiizer_log('proxy_upscale', $userId, $sessionId, 'INFO', "Réponse de l'API externe: " . print_r($responseData, true));

// Retourner la réponse à l'appelant original
http_response_code(200);
echo json_encode(['status' => 'success', 'data' => $responseData]);