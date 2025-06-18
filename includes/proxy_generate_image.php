<?php
// Lire le corps de la requête JSON
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE); // Convertit en array associatif

// Vérifier si 'prompt' est présent dans le JSON
if(isset($input['prompt'])) {
    $promptText = $input['prompt'];

    // L'URL à laquelle nous allons envoyer la requête POST
    $baseUrl = defined('DIRECTUS_API_URL') ? DIRECTUS_API_URL : 'http://customiizer.info:8055';
    $url = "$baseUrl/items/images";

    // Les données à envoyer
    $data = ['prompt' => $promptText];

    // Initialiser une session cURL
    $ch = curl_init($url);

    // Configurer les options de cURL pour la requête POST
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    if (!defined('DIRECTUS_API_TOKEN')) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'DIRECTUS_API_TOKEN not set']);
        exit;
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . DIRECTUS_API_TOKEN
    ]);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

    // Exécuter la requête
    $response = curl_exec($ch);

    // Fermer la session cURL
    curl_close($ch);

    // Vérifier si la requête a réussi
    if ($response === false) {
        // Gérer l'erreur de connexion
        echo json_encode(['status' => 'error', 'message' => 'Impossible de contacter le serveur pour les images.']);
        exit;
    }

    // Décoder la réponse JSON
    $responseData = json_decode($response, true);

    // Vérifier la structure de la réponse
    if (!isset($responseData['data'])) {
        // Gérer l'absence de données attendues
        echo json_encode(['status' => 'error', 'message' => 'Réponse inattendue du serveur pour les images.']);
        exit;
    }

    // Réponse avec succès
    echo json_encode(['status' => 'success', 'data' => $responseData['data']]);
} else {
    // Répondre avec une erreur si 'prompt' n'est pas présent.
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Prompt manquant.']);
}
?>
