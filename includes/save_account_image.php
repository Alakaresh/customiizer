<?php

function save_cropped_image() {
	customiizer_log("save_cropped_image() appelé");

	if (isset($_FILES['croppedImage'])) {
		$uploaded_file = $_FILES['croppedImage'];
		customiizer_log("Fichier téléchargé : " . print_r($uploaded_file, true));

		// Vérifier si des erreurs sont survenues pendant le téléchargement
		if ($uploaded_file['error'] !== UPLOAD_ERR_OK) {
			customiizer_log("Erreur de téléchargement : code d'erreur " . $uploaded_file['error']);
			wp_send_json_error(['error' => 'Upload error code: ' . $uploaded_file['error']]);
			return;
		}

		$user_id = get_current_user_id();
		customiizer_log("ID utilisateur : " . $user_id);

		$base_directory = $_SERVER['DOCUMENT_ROOT'] . '/wp-sauvegarde';
		$user_dir = $base_directory . '/user/' . $user_id;
		$file_path = $user_dir . '/user_logo.png';

		customiizer_log("Chemin de destination : " . $file_path);

		if (!file_exists($user_dir)) {
			customiizer_log("Création du répertoire utilisateur : " . $user_dir);
			wp_mkdir_p($user_dir);
		}

		// ✅ Sauvegarde aussi l'image originale si fournie
		if (isset($_FILES['originalImage']) && $_FILES['originalImage']['error'] === UPLOAD_ERR_OK) {
			$original_tmp = $_FILES['originalImage']['tmp_name'];
			$original_path = $user_dir . '/user_logo_original.png';
			move_uploaded_file($original_tmp, $original_path);
			customiizer_log("Image originale sauvegardée : " . $original_path);
		}

		// ✅ Sauvegarde seulement l'image cropée
		if (move_uploaded_file($uploaded_file['tmp_name'], $file_path)) {
			$url = '/wp-sauvegarde/user/' . $user_id . '/user_logo.png';
			customiizer_log("Image cropée sauvegardée avec succès : " . $url);
			wp_send_json_success(['url' => $url]);
		} else {
			customiizer_log("Échec du déplacement de l'image cropée.");
			wp_send_json_error(['error' => 'Failed to move uploaded file.']);
		}
	} else {
		customiizer_log("Aucun fichier téléchargé.");
		wp_send_json_error(['error' => 'No file uploaded']);
	}
}

add_action('wp_ajax_save_cropped_image', 'save_cropped_image');
