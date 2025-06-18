<?php
// Affiche les erreurs côté serveur pour le debug
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

file_put_contents(__DIR__ . '/generate_debug.log', "Script appelé à " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);

// Vérifie que la constante MIDJOURNEY_API_KEY existe
require_once __DIR__ . '/../../../../../../wp-config.php';


// Re-vérifie que WordPress est bien chargé
if (!defined('ABSPATH')) {
    file_put_contents(__DIR__ . '/generate_debug.log', "WordPress NON chargé (ABSPATH non défini)\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'WordPress non chargé',
    ]);
    exit;
} else {
    file_put_contents(__DIR__ . '/generate_debug.log', "WordPress chargé OK ✅\n", FILE_APPEND);
}


// Constantes d'erreur
const ERROR_MISSING_API_KEY      = 1000;
const ERROR_INVALID_JSON_INPUT   = 1001;
const ERROR_CURL_FAILURE         = 1002;
const ERROR_INVALID_API_RESPONSE = 1003;
const ERROR_REMOTE_API           = 1004;
const ERROR_MISSING_PROMPT       = 1005;

// Vérifie la clé API
if (!defined('MIDJOURNEY_API_KEY')) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'La constante MIDJOURNEY_API_KEY est absente.',
    ]);
    exit;
}

$apiKey = MIDJOURNEY_API_KEY;

// URL par défaut
$apiUrl = defined('MIDJOURNEY_API_URL')
    ? MIDJOURNEY_API_URL
    : 'https://api.userapi.ai/midjourney/v2/imagine';

// Logging personnalisé
function customiizer_log($message, $level = 'INFO') {
    $logFile = __DIR__ . '/logfile.log';
    $currentTime = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$currentTime] [$level] $message" . PHP_EOL, FILE_APPEND);
}

// Lecture des données JSON
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    customiizer_log("Erreur JSON: " . json_last_error_msg(), 'ERROR');
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'JSON mal formé.',
        'code'    => ERROR_INVALID_JSON_INPUT
    ]);
    exit;
}

// Vérifie le prompt
if (empty($input['prompt'])) {
    customiizer_log("Prompt manquant", 'ERROR');
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Prompt manquant.',
        'code'    => ERROR_MISSING_PROMPT
    ]);
    exit;
}

// Préparation des données
$data = [
    'prompt' => $input['prompt'],
    'webhook_url' => $input['webhook_url'] ?? null,
    'webhook_type' => $input['webhook_type'] ?? 'progress',
    'is_disable_prefilter' => $input['is_disable_prefilter'] ?? false,
];

// Envoi à l'API distante
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'api-key: ' . $apiKey,
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

$response = curl_exec($ch);

if ($response === false) {
    $error = curl_error($ch);
    customiizer_log("Erreur cURL: $error", 'ERROR');
    http_response_code(501);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Erreur de connexion à l\'API distante.',
        'code'    => ERROR_CURL_FAILURE,
        'details' => $error
    ]);
    curl_close($ch);
    exit;
}

curl_close($ch);

// Lecture de la réponse API
$responseData = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    $jsonError = json_last_error_msg();
    customiizer_log("Erreur JSON réponse API: " . $jsonError, 'ERROR');
    http_response_code(502);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Réponse JSON invalide depuis l\'API.',
        'code'    => ERROR_INVALID_API_RESPONSE,
        'details' => $jsonError
    ]);
    exit;
}

// Vérifie une erreur côté API
if (isset($responseData['error'])) {
    customiizer_log("Erreur API: " . $responseData['error'], 'ERROR');
    http_response_code(503);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Erreur renvoyée par l\'API Midjourney.',
        'code'    => ERROR_REMOTE_API,
        'details' => $responseData['error']
    ]);
    exit;
}

// Succès
customiizer_log("Succès API: " . json_encode($responseData), 'INFO');
echo json_encode([
    'status' => 'success',
    'data'   => $responseData
]);
