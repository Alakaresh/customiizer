<?php

add_action('rest_api_init', function () {
	register_rest_route('customiizer/v1', '/upload-image/', [
		'methods' => 'POST',
		'callback' => 'customiizer_upload_image',
		'permission_callback' => '__return_true',
	]);

	register_rest_route('customiizer/v1', '/user-images/', [
		'methods' => 'GET',
		'callback' => 'customiizer_get_user_images',
		'permission_callback' => '__return_true',
	]);
});

/**
 * 📤 Téléverse une image sur Azure Blob Storage
 */
function customiizer_upload_image(WP_REST_Request $request) {
	global $wpdb;

	// Récupération des données envoyées
	$params = $request->get_json_params();
	$url = isset($params['url']) ? $params['url'] : '';
	$name = isset($params['name']) ? sanitize_text_field($params['name']) : '';
	$size = isset($params['size']) ? intval($params['size']) : 0;

	if (empty($url) || empty($name)) {
		customiizer_log("❌ Paramètre manquant lors de l'upload.");
		return new WP_REST_Response(["error" => "Paramètre manquant."], 400);
	}

	$user_id = isset($params['user_id']) ? intval($params['user_id']) : get_current_user_id();
        $containerName = defined('AZURE_STORAGE_CONTAINER') ? AZURE_STORAGE_CONTAINER : 'imageclient';
	$blobFolder = $user_id . "/import/";
	$blobName = $blobFolder . pathinfo($name, PATHINFO_FILENAME) . ".webp";
        if (defined('AZURE_STORAGE_BASE_URL')) {
                $blobBaseUrl = rtrim(AZURE_STORAGE_BASE_URL, '/') . '/';
        } else {
                $blobBaseUrl = "https://customiizer.blob.core.windows.net/$containerName/";
        }
	$blobFullUrl = $blobBaseUrl . $blobName;

	customiizer_log("📤 Début de l'upload par UserID: $user_id, Nom: $name");

	// Décodage Base64
	$decodedData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $url));
	if (!$decodedData) {
		customiizer_log("❌ Erreur de décodage de l'image.");
		return new WP_REST_Response(["error" => "Erreur lors du décodage de l'image."], 400);
	}

	// Vérification du type MIME
	$finfo = finfo_open(FILEINFO_MIME_TYPE);
	$mimeType = finfo_buffer($finfo, $decodedData);
	finfo_close($finfo);

	if (!in_array($mimeType, ['image/jpeg', 'image/png'])) {
		customiizer_log("❌ Type MIME non pris en charge: $mimeType");
		return new WP_REST_Response(["error" => "Seuls les fichiers PNG et JPG sont acceptés."], 400);
	}

	// Conversion en WebP
	$sourceImage = imagecreatefromstring($decodedData);
	if (!$sourceImage) {
		customiizer_log("❌ Erreur lors du chargement de l'image.");
		return new WP_REST_Response(["error" => "Erreur lors du chargement de l'image."], 500);
	}

	if ($mimeType === 'image/png') {
		imagealphablending($sourceImage, false);
		imagesavealpha($sourceImage, true);
	}

	$tmpFile = sys_get_temp_dir() . '/' . uniqid() . ".webp";
	if (!imagewebp($sourceImage, $tmpFile)) {
		imagedestroy($sourceImage);
		customiizer_log("❌ Erreur lors de la conversion en WebP.");
		return new WP_REST_Response(["error" => "Erreur lors de la conversion en WebP."], 500);
	}
	imagedestroy($sourceImage);

	customiizer_log("✅ Conversion en WebP réussie: $tmpFile");

	// Téléversement sur Azure
	$blobClient = azure_get_blob_client();
	if (!$blobClient || !azure_upload_blob($blobClient, $containerName, $blobName, $tmpFile)) {
		unlink($tmpFile);
		customiizer_log("❌ Échec du téléversement sur Azure.");
		return new WP_REST_Response(["error" => "Erreur de téléversement sur Azure."], 500);
	}
	unlink($tmpFile); // Suppression du fichier temporaire
	customiizer_log("✅ Téléversement sur Azure réussi: $blobFullUrl");

	// Sauvegarde en base de données
	$table_name = 'WPC_imported_image';
	$image_date = current_time('mysql');

	$result = $wpdb->insert(
		$table_name,
		[
			'user_id' => $user_id,
			'image_url' => $blobFullUrl,
			'image_date' => $image_date,
		],
		['%d', '%s', '%s']
	);

	if ($result === false) {
		customiizer_log("❌ Erreur insertion BDD: " . $wpdb->last_error);
		return new WP_REST_Response(["error" => "Erreur d'insertion en base de données."], 500);
	}

	customiizer_log("✅ Image enregistrée en base de données pour UserID: $user_id");

	return new WP_REST_Response([
		'success' => true, // ✅ ajouter ça
		'message' => 'Image téléchargée avec succès.',
		'blob_path' => $blob_path,
		'db_status' => 'Enregistré en base de données.'
	], 200);

}

/**
 * 🔍 Récupère les images importées par l'utilisateur
 */
function customiizer_get_user_images(WP_REST_Request $request) {
	global $wpdb;

	$user_id = intval($request->get_param('user_id'));

	if (!$user_id) {
		customiizer_log("❌ Paramètre 'user_id' manquant.");
		return new WP_REST_Response(["error" => "Le paramètre 'user_id' est requis."], 400);
	}

	$table_name = 'WPC_imported_image';

	customiizer_log("📥 Demande de récupération des images pour UserID: $user_id");

	$results = $wpdb->get_results($wpdb->prepare("
        SELECT image_url, image_date 
        FROM $table_name 
        WHERE user_id = %d
        ORDER BY image_date DESC
    ", $user_id), ARRAY_A);

	if (empty($results)) {
		customiizer_log("⚠️ Aucune image trouvée pour UserID: $user_id.");
		return new WP_REST_Response(["error" => "Aucune image enregistrée."], 404);
	}

	customiizer_log("✅ Images récupérées avec succès pour UserID: $user_id.");
	return new WP_REST_Response($results, 200);
}
