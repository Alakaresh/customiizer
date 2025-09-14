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

        register_rest_route('customiizer/v1', '/delete-image/', [
                'methods' => 'POST',
                'callback' => 'customiizer_delete_image',
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
        $containerName = "imageclient";

        // Gestion d'un utilisateur invité : on utilise l'identifiant de session
        if ($user_id === 0) {
                if (session_status() === PHP_SESSION_NONE) {
                        session_start();
                }
                $session_id = session_id();
                $blobFolder = "guest_{$session_id}/import/";
        } else {
                $blobFolder = $user_id . "/import/";
        }

        $blobName = $blobFolder . pathinfo($name, PATHINFO_FILENAME) . ".webp";
        $blobBaseUrl = "https://customiizer.blob.core.windows.net/$containerName/";
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

        $image_date = current_time('mysql');

        if ($user_id === 0) {
                // Invité : enregistrer en session
                if (!isset($_SESSION['guest_import_images'])) {
                        $_SESSION['guest_import_images'] = [];
                }
                $_SESSION['guest_import_images'][] = [
                        'image_url' => $blobFullUrl,
                        'image_date' => $image_date,
                ];
                $db_status = 'Enregistré en session.';
        } else {
                // Utilisateur connecté : sauvegarder en base
                $table_name = 'WPC_imported_image';
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
                $db_status = 'Enregistré en base de données.';
        }

        return new WP_REST_Response([
                'success' => true,
                'message' => 'Image téléchargée avec succès.',
                'blob_path' => $blobName,
                'db_status' => $db_status,
        ], 200);

}

/**
 * 🔍 Récupère les images importées par l'utilisateur
 */
function customiizer_get_user_images(WP_REST_Request $request) {
        global $wpdb;

        // Récupération brute pour préserver l'ID 0 (invité)
        $user_id_param = $request->get_param('user_id');
        if ($user_id_param === null || $user_id_param === '') {
                customiizer_log("❌ Paramètre 'user_id' manquant.");
                return new WP_REST_Response(["error" => "Le paramètre 'user_id' est requis."], 400);
        }
        $user_id = intval($user_id_param);

        if ($user_id === 0) {
                if (session_status() === PHP_SESSION_NONE) {
                        session_start();
                }
                $images = isset($_SESSION['guest_import_images']) ? $_SESSION['guest_import_images'] : [];
                return new WP_REST_Response($images, 200);
        }

        $table_name = 'WPC_imported_image';
        $results = $wpdb->get_results($wpdb->prepare(
                "SELECT image_url, image_date FROM $table_name WHERE user_id = %d ORDER BY image_date DESC",
                $user_id
        ), ARRAY_A);

        if (!$results) {
                customiizer_log("⚠️ Aucune image trouvée pour UserID: $user_id.");
                return new WP_REST_Response([], 200);
        }

        customiizer_log("✅ Images récupérées avec succès pour UserID: $user_id.");
        return new WP_REST_Response($results, 200);
}

/**
 * 🗑️ Supprime une image importée de la base et du stockage Azure
 */
function customiizer_delete_image(WP_REST_Request $request) {
        global $wpdb;

        $params = $request->get_json_params();
        $image_url = isset($params['image_url']) ? $params['image_url'] : '';
        $user_id = isset($params['user_id']) ? intval($params['user_id']) : get_current_user_id();

        if (empty($image_url)) {
                return new WP_REST_Response(['error' => "Paramètre 'image_url' manquant."], 400);
        }

        $containerName = 'imageclient';
        $path = parse_url($image_url, PHP_URL_PATH);
        $blobName = '';
        if ($path) {
                $blobName = ltrim(str_replace('/' . $containerName . '/', '', $path), '/');
        }

        $blobDeleted = false;
        $blobClient = azure_get_blob_client();
        if ($blobClient && $blobName) {
                $blobDeleted = azure_delete_blob($blobClient, $containerName, $blobName);
        }

        if ($user_id === 0) {
                if (session_status() === PHP_SESSION_NONE) {
                        session_start();
                }
                if (isset($_SESSION['guest_import_images'])) {
                        $_SESSION['guest_import_images'] = array_values(array_filter(
                                $_SESSION['guest_import_images'],
                                function ($img) use ($image_url) {
                                        return ($img['image_url'] ?? '') !== $image_url;
                                }
                        ));
                }
        } else {
                $table_name = 'WPC_imported_image';
                $wpdb->delete($table_name, ['user_id' => $user_id, 'image_url' => $image_url], ['%d', '%s']);
        }

        return new WP_REST_Response(['success' => true, 'deleted' => $blobDeleted], 200);
}
