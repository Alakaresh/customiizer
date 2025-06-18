<?php
require_once dirname(__DIR__, 5) . '/wp-load.php';
$apiUrl = defined('MIDJOURNEY_API_URL')
    ? MIDJOURNEY_API_URL
    : 'https://api.userapi.ai/midjourney/v2/imagine';

// Codes d'erreur pour faciliter le diagnostic depuis le frontend
const ERROR_MISSING_API_KEY        = 1000;
const ERROR_INVALID_JSON_INPUT     = 1001;
const ERROR_CURL_FAILURE           = 1002;
const ERROR_INVALID_API_RESPONSE   = 1003;
const ERROR_REMOTE_API             = 1004;
const ERROR_MISSING_PROMPT         = 1005;

if (!defined('MIDJOURNEY_API_KEY')) {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'The constant MIDJOURNEY_API_KEY is undefined.',
        'code'    => ERROR_MISSING_API_KEY
    ]);
    exit;
}
$apiKey = MIDJOURNEY_API_KEY;

function customiizer_log($message, $level = 'INFO') {
    $logFile = __DIR__ . '/logfile.log';
    $currentTime = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$currentTime] [$level] $message" . PHP_EOL, FILE_APPEND);
}

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
        echo json_encode([
            'status'  => 'error',
            'message' => 'Erreur de connexion à l\'API.',
            'code'    => ERROR_CURL_FAILURE,
            'details' => $error
        ]);
        curl_close($ch);
        exit;
    }

    curl_close($ch);

    $responseData = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $jsonError = json_last_error_msg();
        customiizer_log("Erreur JSON API: " . $jsonError, 'ERROR');
        http_response_code(500);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Réponse API invalide.',
            'code'    => ERROR_INVALID_API_RESPONSE,
            'details' => $jsonError
        ]);
        exit;
    }

    if (isset($responseData['error'])) {
        customiizer_log("Erreur API: " . $responseData['error'], 'ERROR');
        http_response_code(500);
        echo json_encode([
            'status'  => 'error',
            'message' => 'Erreur depuis l\'API.',
            'code'    => ERROR_REMOTE_API,
            'details' => $responseData['error']
        ]);
        exit;
    }

    customiizer_log("Succès API: " . json_encode($responseData));
    echo json_encode(['status' => 'success', 'data' => $responseData]);
} else {
    customiizer_log("Prompt manquant", 'ERROR');
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Prompt manquant.',
        'code'    => ERROR_MISSING_PROMPT
    ]);
}
?>
