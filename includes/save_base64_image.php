<?php
function save_image_from_base64() {
    if (!isset($_POST['image_base64'])) {
        wp_send_json_error(['message' => 'Paramètre image_base64 manquant.'], 400);
    }

    $rawData = $_POST['image_base64'];
    $matches = [];
    $extension = 'png';
    if (preg_match('#^data:image/([a-z0-9.+-]+);base64,#i', $rawData, $matches)) {
        $candidate = strtolower($matches[1]);
        if ($candidate === 'jpeg') {
            $candidate = 'jpg';
        } elseif ($candidate === 'svg+xml') {
            $candidate = 'svg';
        }
        $allowed = ['png', 'jpg', 'jpeg', 'webp'];
        if (in_array($candidate, $allowed, true)) {
            $extension = $candidate === 'jpeg' ? 'jpg' : $candidate;
        }
    }

    $data = preg_replace('#^data:image/\w+;base64,#i', '', $rawData);
    $decoded = base64_decode($data);
    if ($decoded === false) {
        wp_send_json_error(['message' => 'Données base64 invalides.'], 400);
    }

    if (!function_exists('azure_get_blob_client')) {
        wp_send_json_error(['message' => 'Service Azure indisponible.'], 500);
    }

    $blobClient = azure_get_blob_client();
    if (!$blobClient) {
        wp_send_json_error(['message' => 'Connexion Azure impossible.'], 500);
    }

    $sanitizedFilename = isset($_POST['filename']) ? sanitize_file_name($_POST['filename']) : '';
    $filenameWithoutExt = $sanitizedFilename ? pathinfo($sanitizedFilename, PATHINFO_FILENAME) : '';
    $filenameWithoutExt = $filenameWithoutExt ?: 'design';
    $filenameWithoutExt = preg_replace('/[^a-z0-9_-]+/i', '-', strtolower($filenameWithoutExt));
    $filenameWithoutExt = trim($filenameWithoutExt, '-');
    if (!$filenameWithoutExt) {
        $filenameWithoutExt = 'design';
    }

    $uniqueSuffix = str_replace('.', '-', uniqid('', true));
    $finalFilename = $filenameWithoutExt . '-' . $uniqueSuffix . '.' . $extension;

    $userId = get_current_user_id();
    $pathSegments = ['product-images', 'customizer'];
    if ($userId) {
        $pathSegments[] = 'user-' . intval($userId);
    } else {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $sessionId = session_id();
        $pathSegments[] = 'guest-' . substr($sessionId ?: 'anon', 0, 12);
    }
    $pathSegments[] = gmdate('Y');
    $pathSegments[] = gmdate('m');
    $pathSegments[] = gmdate('d');

    $blobName = implode('/', $pathSegments) . '/' . $finalFilename;
    $containerName = 'temp';

    $tmpFile = tempnam(sys_get_temp_dir(), 'customizer_');
    if ($tmpFile === false) {
        wp_send_json_error(['message' => 'Impossible de créer un fichier temporaire.'], 500);
    }

    $bytesWritten = file_put_contents($tmpFile, $decoded);
    if ($bytesWritten === false || $bytesWritten === 0) {
        @unlink($tmpFile);
        wp_send_json_error(['message' => 'Erreur lors de l\'écriture du fichier temporaire.'], 500);
    }

    $uploaded = azure_upload_blob($blobClient, $containerName, $blobName, $tmpFile);
    @unlink($tmpFile);

    if (!$uploaded) {
        wp_send_json_error(['message' => 'Échec de l\'upload Azure.'], 500);
    }

    $baseUrl = sprintf('https://customiizer.blob.core.windows.net/%s/', $containerName);
    $imageUrl = $baseUrl . ltrim($blobName, '/');

    wp_send_json_success([
        'image_url' => esc_url_raw($imageUrl),
        'blob_name' => $blobName,
    ]);
}
add_action('wp_ajax_save_image_from_base64', 'save_image_from_base64');
add_action('wp_ajax_nopriv_save_image_from_base64', 'save_image_from_base64');
