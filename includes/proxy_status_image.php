<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (isset($_GET['id'])) {
    $idImage = $_GET['id'];
    $baseUrl = defined('DIRECTUS_API_URL') ? DIRECTUS_API_URL : 'http://customiizer.info:8055';
    $url = "$baseUrl/items/images/$idImage";
    if (!defined('DIRECTUS_API_TOKEN')) {
        http_response_code(500);
        echo json_encode(['error' => 'DIRECTUS_API_TOKEN not set']);
        exit;
    }
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . DIRECTUS_API_TOKEN
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $response = curl_exec($ch);
    curl_close($ch);

    if ($response === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to retrieve the image status.']);
        exit;
    }

    // Convertir la réponse JSON en un tableau associatif
    $responseData = json_decode($response, true);
    
    // Vérifier si la clé 'data' existe dans la réponse
    if (!isset($responseData['data'])) {
        http_response_code(500);
        echo json_encode(['error' => 'Unexpected response structure from the server.']);
        exit;
    }

    // Extraire et renvoyer spécifiquement le statut de l'image
    $status = $responseData['data']['status'] ?? 'unknown';
	$progress = $responseData['data']['progress'] ?? '0';
    $url = $responseData['data']['url'] ?? null;
    $upscaledUrls = $responseData['data']['upscaled_urls'] ?? [];
    
    echo json_encode([
        'status' => $status,
        'url' => $url,
        'upscaled_urls' => $upscaledUrls,
		'progress' => $progress
    ]);
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Image ID is missing.']);
}
?>
