<?php
// Paramètres API
$apiUrl = defined('MIDJOURNEY_API_URL')
    ? MIDJOURNEY_API_URL
    : 'https://api.userapi.ai/midjourney/v2/imagine';
if (!defined('MIDJOURNEY_API_KEY')) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'The constant MIDJOURNEY_API_KEY is undefined.'
    ]);
    exit;
}
$apiKey = MIDJOURNEY_API_KEY;

function customiizer_log($message, $level = 'INFO') {
    $logFile = 'logfile.log';
    $currentTime = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$currentTime] [$level] $message" . PHP_EOL, FILE_APPEND);
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    customiizer_log("Erreur JSON: " . json_last_error_msg(), 'ERROR');
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
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erreur de connexion à l\'API.']);
        curl_close($ch);
        exit;
    }

    curl_close($ch);

    $responseData = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        customiizer_log("Erreur JSON API: " . json_last_error_msg(), 'ERROR');
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Réponse API invalide.']);
        exit;
    }

    if (isset($responseData['error'])) {
        customiizer_log("Erreur API: " . $responseData['error'], 'ERROR');
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erreur depuis l\'API.', 'details' => $responseData['error']]);
        exit;
    }

    customiizer_log("Succès API: " . json_encode($responseData));
    echo json_encode(['status' => 'success', 'data' => $responseData]);
} else {
    customiizer_log("Prompt manquant", 'ERROR');
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Prompt manquant.']);
}
?>