<?php
if (!isset($_GET['url'])) {
    http_response_code(400);
    echo 'URL manquante';
    exit;
}

$url = $_GET['url'];

// Vérifie que l’URL vient bien de Discord CDN
if (!str_starts_with($url, 'https://cdn.discordapp.com/')) {
    http_response_code(403);
    echo 'URL non autorisée';
    exit;
}

// Récupère le contenu distant
$headers = get_headers($url, 1);
$contentType = $headers["Content-Type"] ?? 'image/webp';

header("Content-Type: $contentType");
header("Cache-Control: no-cache");

readfile($url);
