<?php
header('Content-Type: application/json');

ini_set('display_errors', 0);    // Ne pas afficher d'erreurs HTML
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Capture les exceptions non interceptées
set_exception_handler(function($e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Erreur non interceptée',
        'details' => $e->getMessage()
    ]);
});

// Capture les erreurs fatales
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Erreur fatale',
            'details' => $error['message']
        ]);
    }
});

// Log initial
file_put_contents(__DIR__ . '/generate_debug.log', "▶ Script appelé à " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);

// Charger les constantes depuis WordPress
file_put_contents(__DIR__ . '/generate_debug.log', "📥 Chargement wp-config...\n", FILE_APPEND);
define('SHORTINIT', true);
require_once __DIR__ . '/../../../../../../wp-config.php';


// Vérification WordPress
if (!defined('ABSPATH')) {
    file_put_contents(__DIR__ . '/generate_debug.log', "❌ WordPress NON chargé\n", FILE_APPEND);
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'WordPress non chargé']);
    exit;
}
file_put_contents(__DIR__ . '/generate_debug.log', "✅ WordPress chargé\n", FILE_APPEND);

// Vérification constante
if (!defined('MIDJOURNEY_API_KEY')) {
    file_put_contents(__DIR__ . '/generate_debug.log', "❌ Clé API manquante\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Clé API manquante']);
    exit;
}

$apiKey = MIDJOURNEY_API_KEY;
$apiUrl = defined('MIDJOURNEY_API_URL') ? MIDJOURNEY_API_URL : 'https://api.userapi.ai/midjourney/v2/imagine';

// Lecture JSON brut
$inputJSON = file_get_contents('php://input');
file_put_contents(__DIR__ . '/generate_debug.log', "📦 JSON reçu brut : $inputJSON\n", FILE_APPEND);
$input = json_decode($inputJSON, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    file_put_contents(__DIR__ . '/generate_debug.log', "❌ Erreur JSON : " . json_last_error_msg() . "\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'JSON mal formé']);
    exit;
}

// Vérifie le prompt
if (empty($input['prompt'])) {
    file_put_contents(__DIR__ . '/generate_debug.log', "❌ Prompt manquant\n", FILE_APPEND);
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Prompt manquant']);
    exit;
}

// Prépare les données à envoyer
$data = [
    'prompt' => $input['prompt'],
    'webhook_url' => $input['webhook_url'] ?? null,
    'webhook_type' => $input['webhook_type'] ?? 'progress',
    'is_disable_prefilter' => $input['is_disable_prefilter'] ?? false,
];
file_put_contents(__DIR__ . '/generate_debug.log', "🚀 Envoi à l'API Midjourney\n", FILE_APPEND);

// Envoie vers l’API Midjourney
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
    file_put_contents(__DIR__ . '/generate_debug.log', "❌ Erreur cURL : $error\n", FILE_APPEND);
    http_response_code(501);
    echo json_encode(['status' => 'error', 'message' => 'Erreur cURL', 'details' => $error]);
    curl_close($ch);
    exit;
}
curl_close($ch);
file_put_contents(__DIR__ . '/generate_debug.log', "📨 Réponse API brute : $response\n", FILE_APPEND);

// Parse la réponse
$responseData = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    $jsonError = json_last_error_msg();
    file_put_contents(__DIR__ . '/generate_debug.log', "❌ JSON réponse invalide : $jsonError\n", FILE_APPEND);
    http_response_code(502);
    echo json_encode(['status' => 'error', 'message' => 'Réponse JSON invalide', 'details' => $jsonError]);
    exit;
}

if (isset($responseData['error'])) {
    file_put_contents(__DIR__ . '/generate_debug.log', "❌ Erreur API : " . $responseData['error'] . "\n", FILE_APPEND);
    http_response_code(503);
    echo json_encode(['status' => 'error', 'message' => 'Erreur API', 'details' => $responseData['error']]);
    exit;
}

// Tout s'est bien passé
file_put_contents(__DIR__ . '/generate_debug.log', "✅ Succès : " . json_encode($responseData) . "\n", FILE_APPEND);
echo json_encode(['status' => 'success', 'data' => $responseData]);
