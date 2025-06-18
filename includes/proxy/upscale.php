<?php
define('MIDJOURNEY_API_KEY', '28e69054-9d20-453b-bdc9-79c2f86c027d');
define('MIDJOURNEY_API_URL', 'https://api.userapi.ai/midjourney/v2/upscale');
// Paramètres API
$apiUrl = defined('MIDJOURNEY_API_URL')
    ? MIDJOURNEY_API_URL
    : 'https://api.userapi.ai/midjourney/v2/upscale';
if (!defined('MIDJOURNEY_API_KEY')) {
        http_response_code(400);
        echo json_encode([
                'status' => 'error',
                'message' => 'The constant MIDJOURNEY_API_KEY is undefined.'
        ]);
        exit;
}
$apiKey = MIDJOURNEY_API_KEY;

// Fonction pour enregistrer les logs
function customiizer_log($message) {
        $logFile = __DIR__ . '/logfile.log'; // Remplace par le chemin de ton fichier de log
        $currentTime = date('Y-m-d H:i:s');
        file_put_contents($logFile, "[$currentTime] $message" . PHP_EOL, FILE_APPEND);
}

// Lire le corps de la requête JSON
$inputJSON = file_get_contents('php://input');
customiizer_log("Reçu JSON: $inputJSON");

$input = json_decode($inputJSON, true);

if (json_last_error() !== JSON_ERROR_NONE) {
	customiizer_log("Erreur JSON: " . json_last_error_msg());
	http_response_code(400);
	echo json_encode(['status' => 'error', 'message' => 'JSON mal formé.']);
	exit;
}

// Vérification des données reçues
if (!isset($input['hash']) || !isset($input['choice']) || !isset($input['webhook_url']) || !isset($input['webhook_type'])) {
	customiizer_log("Données manquantes dans la requête.");
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
$ch = curl_init($apiUrl);

// Configurer les options de cURL pour la requête POST
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
	'Content-Type: application/json',
        'api-key: ' . $apiKey
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

// Exécuter la requête cURL
$response = curl_exec($ch);

if ($response === false) {
	customiizer_log("Erreur cURL: " . curl_error($ch));
	http_response_code(500);
	echo json_encode(['status' => 'error', 'message' => 'Erreur lors de la requête externe.']);
	curl_close($ch);
	exit;
}

curl_close($ch);

// Traiter la réponse de l'API externe
$responseData = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
	customiizer_log("Erreur JSON dans la réponse: " . json_last_error_msg());
	http_response_code(500);
	echo json_encode(['status' => 'error', 'message' => 'Réponse JSON mal formée de l\'API externe.']);
	exit;
}

customiizer_log("Réponse de l'API externe: " . print_r($responseData, true));

// Retourner la réponse à l'appelant original
http_response_code(200);
echo json_encode(['status' => 'success', 'data' => $responseData]);
