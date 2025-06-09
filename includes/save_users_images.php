<?php

// Fonction principale pour gérer l'image
function save_image_from_url() {
	try {
		// Récupération et validation
		$url = sanitize_text_field($_POST['url']);
		$name = sanitize_text_field($_POST['name']);
		$prefix = sanitize_text_field($_POST['prefix']);
		$ratio = sanitize_text_field($_POST['ratio']);

		if (empty($url) || empty($name) || empty($prefix) || empty($ratio)) {
			$msg = "❌ Paramètre(s) manquant(s)";
			customiizer_log($msg);
			wp_send_json_error(['message' => $msg]);
		}

		$user_id = get_current_user_id();
		$blobName = "$user_id/$prefix" . "_" . "$name.webp";
		customiizer_log("📂 Blob cible Azure : $blobName");

		// Traitement image
		$tmpFile = ajusterEtSauvegarderImageWebP($url, $blobName, $ratio);
		if ($tmpFile === false) {
			$msg = "❌ Erreur pendant le traitement de l'image";
			customiizer_log($msg);
			wp_send_json_error(['message' => $msg, 'source_url' => $url]);
		}

		// Connexion Azure
		$blobClient = azure_get_blob_client();
		if (!$blobClient) {
			$msg = "❌ Erreur de connexion Azure";
			customiizer_log($msg);
			wp_send_json_error(['message' => $msg]);
		}

		// Upload Azure
		$containerName = "imageclient";
		if (azure_upload_blob($blobClient, $containerName, $blobName, $tmpFile)) {
			unlink($tmpFile);
			wp_send_json_success(['message' => "Image uploadée", 'blob' => $blobName]);
		} else {
			$msg = "❌ Échec de l'upload Azure";
			customiizer_log($msg);
			wp_send_json_error(['message' => $msg]);
		}
	} catch (Throwable $e) {
		customiizer_log("💥 Exception attrapée : " . $e->getMessage());
		wp_send_json_error([
			'message' => "Erreur fatale attrapée",
			'exception' => $e->getMessage()
		]);
	}
}
add_action('wp_ajax_save_image_from_url', 'save_image_from_url');
add_action('wp_ajax_nopriv_save_image_from_url', 'save_image_from_url');

// Fonction pour ajuster et convertir une image en WebP
function ajusterEtSauvegarderImageWebP($sourceUrl, $blobName, $ratio) {

	if (strpos($ratio, ':') !== false) {
		list($w, $h) = explode(':', $ratio);
		$ratioNumerique = floatval($w) / floatval($h);
	} else {
		customiizer_log("❌ Ratio mal formé : $ratio");
		return false;
	}

	// Téléchargement via cURL
	$ch = curl_init($sourceUrl);
	curl_setopt_array($ch, [
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_FOLLOWLOCATION => true,
		CURLOPT_TIMEOUT => 20,
		CURLOPT_USERAGENT => 'Mozilla/5.0'
	]);
	$data = curl_exec($ch);
	$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
	$error = curl_error($ch);
	curl_close($ch);

	if (!$data || $httpCode >= 400) {
		customiizer_log("❌ Échec téléchargement image [HTTP $httpCode] : $error");
		return false;
	}

	$source = imagecreatefromstring($data);
	if (!$source) {
		customiizer_log("❌ Impossible de créer une image à partir des données téléchargées.");
		return false;
	}

	$width = imagesx($source);
	$newHeight = $width / $ratioNumerique;
	$dest = imagecreatetruecolor($width, $newHeight);
	imagecopyresampled($dest, $source, 0, 0, 0, 0, $width, $newHeight, $width, imagesy($source));

	$tmpFile = tempnam(sys_get_temp_dir(), 'webp_');
	imagewebp($dest, $tmpFile);

	imagedestroy($source);
	imagedestroy($dest);

	return $tmpFile;
}


// Fonction pour sauvegarder les métadonnées d'une image dans la base de données
function save_image_data() {
	global $wpdb;

	$data = array(
		'user_id' => sanitize_text_field($_POST['customer_id']),
		'image_url' => esc_url_raw($_POST['image_url']),
		'source_id' => sanitize_text_field($_POST['source_id']),
		'image_prefix' => sanitize_text_field($_POST['image_prefix']),
		'prompt' => sanitize_text_field($_POST['prompt']),
		'format_image' => sanitize_text_field($_POST['format_image']),
		'upscaled_id' => sanitize_text_field($_POST['upscaled_id']),
		'settings' => sanitize_text_field($_POST['settings']),
		'image_date' => current_time('mysql'),
	);

	$existingImage = $wpdb->get_row(
		$wpdb->prepare("SELECT * FROM WPC_generated_image WHERE image_url = %s", $data['image_url'])
	);

	if ($existingImage) {
		wp_send_json_error("L'image existe déjà.");
	} else {
		$lastNumber = intval($wpdb->get_var("SELECT MAX(image_number) FROM WPC_generated_image")) + 1;
		$data['image_number'] = $lastNumber;

		$wpdb->insert('WPC_generated_image', $data);
		wp_send_json_success("Données enregistrées avec succès.");
	}
}
add_action('wp_ajax_save_image_data', 'save_image_data');
add_action('wp_ajax_nopriv_save_image_data', 'save_image_data');

function get_profile_crop_data() {
	if (!is_user_logged_in()) {
		wp_send_json_error(['message' => 'Non connecté']);
	}

	$user_id = get_current_user_id();
	global $wpdb;
	$table = 'WPC_users'; // ou avec $wpdb->prefix si besoin

	$data = $wpdb->get_row($wpdb->prepare(
		"SELECT crop_x, crop_y, crop_width, crop_height FROM $table WHERE user_id = %d",
		$user_id
	), ARRAY_A);

	if ($data && isset($data['crop_width']) && $data['crop_width'] > 0) {
		wp_send_json_success($data);
	} else {
		wp_send_json_error(['message' => 'Aucune donnée de crop']);
	}
}
add_action('wp_ajax_get_profile_crop_data', 'get_profile_crop_data');