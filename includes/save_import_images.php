<?php

function save_imported_image_from_url() {
    // Récupérer et valider les paramètres
    $url = isset($_POST['url']) ? $_POST['url'] : '';
    $name = isset($_POST['name']) ? sanitize_text_field($_POST['name']) : '';
    $size = isset($_POST['size']) ? intval($_POST['size']) : 0;

    if (empty($url) || empty($name)) {
        wp_send_json_error("Paramètre manquant.");
        return;
    }

    $user_id = get_current_user_id();

    $containerName = "imageclient";
    $blobFolder = $user_id . "/import/";
    $blobName = $blobFolder . pathinfo($name, PATHINFO_FILENAME) . ".webp";

    // URL de base d'Azure Blob Storage
    $blobBaseUrl = "https://customiizer.blob.core.windows.net/$containerName/";
    $blobFullUrl = $blobBaseUrl . $blobName;

    // Décoder l'image encodée en base64
    $decodedData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $url));
    if (!$decodedData) {
        wp_send_json_error("Erreur lors du décodage de l'image.");
        return;
    }

    // Vérifier le type MIME du fichier
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_buffer($finfo, $decodedData);
    finfo_close($finfo);

    if (!in_array($mimeType, ['image/jpeg', 'image/png'])) {
        wp_send_json_error("Seuls les fichiers PNG et JPG sont acceptés.");
        return;
    }

    // Convertir en WebP
    $sourceImage = imagecreatefromstring($decodedData);
    if (!$sourceImage) {
        wp_send_json_error("Erreur lors du chargement de l'image.");
        return;
    }

    if ($mimeType === 'image/png') {
        imagealphablending($sourceImage, false);
        imagesavealpha($sourceImage, true);
    }

    $tmpFile = sys_get_temp_dir() . '/' . uniqid() . ".webp";

    if (!imagewebp($sourceImage, $tmpFile)) {
        imagedestroy($sourceImage);
        wp_send_json_error("Erreur lors de la conversion de l'image en WebP.");
        return;
    }
    imagedestroy($sourceImage);

    // Connexion à Azure
    $blobClient = azure_get_blob_client();
    if (!$blobClient) {
        unlink($tmpFile);
        wp_send_json_error("Erreur de connexion à Azure.");
        return;
    }

    // Téléverser dans Azure
    if (!azure_upload_blob($blobClient, $containerName, $blobName, $tmpFile)) {
        unlink($tmpFile);
        wp_send_json_error("Erreur lors du téléversement de l'image.");
        return;
    }

    unlink($tmpFile); // Supprimer le fichier temporaire

    // Sauvegarder les métadonnées dans la base de données
    global $wpdb;
    $table_name = 'WPC_imported_image';
    $image_date = current_time('mysql');

    $result = $wpdb->insert(
        $table_name,
        [
            'customer_id' => $user_id,
            'image_url' => $blobFullUrl,
            'image_date' => $image_date,
        ],
        ['%d', '%s', '%s']
    );

    if ($result === false) {
        wp_send_json_error("Erreur lors de l'insertion dans la base de données : " . $wpdb->last_error);
        return;
    }

    wp_send_json_success([
        "message" => "L'image a été téléchargée et enregistrée avec succès.",
        "blob_path" => $blobFullUrl,
        "db_status" => "Enregistré dans la base de données."
    ]);
}

add_action('wp_ajax_save_imported_image_from_url', 'save_imported_image_from_url');
add_action('wp_ajax_nopriv_save_imported_image_from_url', 'save_imported_image_from_url');

function get_saved_images() {
    global $wpdb;

    $user_id = get_current_user_id();
    $table_name = 'WPC_imported_image';

    // Rechercher les images pour l'utilisateur connecté
    $results = $wpdb->get_results($wpdb->prepare("
        SELECT image_url, image_date 
        FROM $table_name 
        WHERE customer_id = %d
        ORDER BY image_date DESC
    ", $user_id), ARRAY_A);

    if (!$results) {
        wp_send_json_error("Aucune image enregistrée.");
    } else {
        wp_send_json_success($results);
    }
}
add_action('wp_ajax_get_saved_images', 'get_saved_images'); // AJAX pour utilisateur connecté
add_action('wp_ajax_nopriv_get_saved_images', 'get_saved_images'); // Optionnel pour visiteurs
