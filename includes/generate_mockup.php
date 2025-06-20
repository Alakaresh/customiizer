<?php

function generate_mockup_printful($image_url, $product_id, $variant_id, $style_id, $placement, $technique, $width, $height, $top, $left) {
        $api_key = '4Pyo1mdQ4nDwOSH2WTBaSgFzhgBRYOhd2LRIYsMl';
        $url = 'https://api.printful.com/v2/mockup-tasks';
        $start = microtime(true);

	$data = [
		"format" => "png",
		"products" => [
			[
				"source" => "catalog",
				"mockup_style_ids" => [$style_id],
				"catalog_product_id" => (int)$product_id,
				"catalog_variant_ids" => [$variant_id],
				"placements" => [
					[
						"placement" => $placement,
						"technique" => $technique,
						"layers" => [
							[
								"type" => "file",
								"url" => $image_url,
								"position" => [
									"width" => $width,
									"height" => $height,
									"top" => $top,
									"left" => $left
								]
							]
						]
					]
				]
			]
		]
	];

	customiizer_log("🔹 Envoi des données Printful : " . json_encode($data, JSON_PRETTY_PRINT));

	$ch = curl_init($url);
	curl_setopt($ch, CURLOPT_HTTPHEADER, [
		'Content-Type: application/json',
		"Authorization: Bearer $api_key"
	]);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_POST, true);
	curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

	$result = curl_exec($ch);
	$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

	if (curl_errno($ch)) {
		$error_msg = curl_error($ch);
		customiizer_log("Erreur cURL : {$error_msg}");
		curl_close($ch);
		return ['success' => false, 'error' => $error_msg];
	}

	curl_close($ch);

        customiizer_log("API Printful HTTP Code: {$httpCode}");
        customiizer_log("Réponse Printful: {$result}");

        if ($httpCode !== 200) {
                $duration = round(microtime(true) - $start, 3);
                customiizer_log("⏲️ Appel API Printful terminé en {$duration}s (HTTP {$httpCode})");
                return ['success' => false, 'error' => "Erreur HTTP {$httpCode}", 'printful_response' => $result];
        }

        $duration = round(microtime(true) - $start, 3);
        customiizer_log("⏲️ Appel API Printful terminé en {$duration}s");
        return json_decode($result, true);
}


add_action('wp_ajax_generate_mockup', 'handle_generate_mockup');
add_action('wp_ajax_nopriv_generate_mockup', 'handle_generate_mockup');

function handle_generate_mockup() {
    $overall_start = microtime(true);
    if (!isset($_POST['image_url'])) {
        customiizer_log("❌ image_url manquant !");
        $total = round(microtime(true) - $overall_start, 3);
        customiizer_log("⏱️ Génération échouée en {$total}s");
        wp_send_json_error(['message' => 'URL de l\'image manquante.']);
    }

    // 🔍 Log brut pour contrôle
    customiizer_log("📥 Données POST reçues : " . json_encode($_POST, JSON_PRETTY_PRINT));

    $webp_url   = sanitize_text_field($_POST['image_url']);
    $product_id = intval($_POST['product_id']);
    $variant_id = intval($_POST['variant_id']);
    $style_id   = intval($_POST['style_id']);
    $placement  = sanitize_text_field($_POST['placement']);
    $technique  = sanitize_text_field($_POST['technique']);

    // Ces valeurs sont **déjà en pouces** : on ne fait plus de conversion
    $width_in  = floatval($_POST['width']);
    $height_in = floatval($_POST['height']);
    $left_in   = floatval($_POST['left']);
    $top_in    = floatval($_POST['top']);

    if ($width_in < 0.3 || $height_in < 0.3) {
        $total = round(microtime(true) - $overall_start, 3);
        customiizer_log("⏱️ Génération échouée en {$total}s");
        wp_send_json_error(['message' => 'La largeur et la hauteur doivent être ≥ 0.3 pouce.']);
    }

    customiizer_log("📐 Dimensions en pouces reçues : width={$width_in}, height={$height_in}, top={$top_in}, left={$left_in}");

    // 🔁 Conversion de l’image WebP en PNG
    $step_start = microtime(true);
    $conversion_result = convert_webp_to_png_server($webp_url);
    $elapsed = round(microtime(true) - $step_start, 3);
    customiizer_log("⏲️ Conversion WebP->PNG : {$elapsed}s");
    if (!$conversion_result['success']) {
        $total = round(microtime(true) - $overall_start, 3);
        customiizer_log("⏱️ Génération échouée en {$total}s");
        wp_send_json_error(['message' => $conversion_result['message']]);
    }
    $png_url   = $conversion_result['png_url'];
    $file_path = $conversion_result['file_path'];

    customiizer_log("🖼️ Image combinée locale : $file_path");

    // 🎯 Appel API Printful avec les pouces tels quels
    $response = generate_mockup_printful(
        $png_url,
        $product_id,
        $variant_id,
        $style_id,
        $placement,
        $technique,
        $width_in,
        $height_in,
        $top_in,
        $left_in
    );

        if (isset($response['data'][0]['id'])) {
		$task_id = $response['data'][0]['id'];

                $step_start = microtime(true);
                $mockup_status = wait_for_mockup_completion($task_id);
                $elapsed_wait = round(microtime(true) - $step_start, 3);
                customiizer_log("⏲️ Attente du mockup : {$elapsed_wait}s");

		if ($mockup_status['success']) {
			$mockups = $mockup_status['data']['catalog_variant_mockups'] ?? [];

			if (!empty($mockups)) {
				$mockup_url = $mockups[0]['mockups'][0]['mockup_url'] ?? null;

                                if ($mockup_url) {
                                        if (!unlink($file_path)) {
                                                customiizer_log("⚠️ Erreur lors de la suppression du fichier temporaire $file_path");
                                        } else {
                                                customiizer_log("🗑️ Fichier temporaire supprimé : $file_path");
                                        }
                                        $total = round(microtime(true) - $overall_start, 3);
                                        customiizer_log("⏱️ Génération terminée en {$total}s");
                                        wp_send_json_success(['mockup_url' => $mockup_url]);
                                } else {
                                        customiizer_log("❌ Aucun mockup_url trouvé");
                                        if (!unlink($file_path)) {
                                                customiizer_log("⚠️ Erreur lors de la suppression du fichier temporaire $file_path");
                                        } else {
                                                customiizer_log("🗑️ Fichier temporaire supprimé : $file_path");
                                        }
                                        $total = round(microtime(true) - $overall_start, 3);
                                        customiizer_log("⏱️ Génération échouée en {$total}s");
                                        wp_send_json_error(['message' => 'URL du mockup introuvable.']);
                                }
                        } else {
                                customiizer_log("❌ Aucun mockup généré.");
                                if (!unlink($file_path)) {
                                        customiizer_log("⚠️ Erreur lors de la suppression du fichier temporaire $file_path");
                                } else {
                                        customiizer_log("🗑️ Fichier temporaire supprimé : $file_path");
                                }
                                $total = round(microtime(true) - $overall_start, 3);
                                customiizer_log("⏱️ Génération échouée en {$total}s");
                                wp_send_json_error(['message' => 'Aucun mockup généré.']);
                        }
                } else {
                        customiizer_log("❌ Erreur de statut : " . $mockup_status['error']);
                        if (!unlink($file_path)) {
                                customiizer_log("⚠️ Erreur lors de la suppression du fichier temporaire $file_path");
                        } else {
                                customiizer_log("🗑️ Fichier temporaire supprimé : $file_path");
                        }
                        $total = round(microtime(true) - $overall_start, 3);
                        customiizer_log("⏱️ Génération échouée en {$total}s");
                        wp_send_json_error(['message' => $mockup_status['error']]);
                }
        } else {
                customiizer_log("❌ Erreur API : " . ($response['error'] ?? 'Non spécifiée'));
                if (!unlink($file_path)) {
                        customiizer_log("⚠️ Erreur lors de la suppression du fichier temporaire $file_path");
                } else {
                        customiizer_log("🗑️ Fichier temporaire supprimé : $file_path");
                }
                $total = round(microtime(true) - $overall_start, 3);
                customiizer_log("⏱️ Génération échouée en {$total}s");
                wp_send_json_error(['message' => $response['error'] ?? 'Erreur inconnue']);
        }
}
function convert_webp_to_png_server($image_url) {
        $parts = wp_parse_url($image_url);
        $ext   = strtolower(pathinfo($parts['path'] ?? '', PATHINFO_EXTENSION));

        if (!$parts || !in_array($parts['scheme'] ?? '', ['http', 'https'], true)) {
                customiizer_log("❌ URL invalide : $image_url");
                return ['success' => false, 'message' => "URL d'image invalide."];
        }

        if (defined('ALLOWED_IMAGE_HOSTS') && !in_array($parts['host'], ALLOWED_IMAGE_HOSTS, true)) {
                customiizer_log("❌ Hôte non autorisé : {$parts['host']}");
                return ['success' => false, 'message' => 'Hôte non autorisé.'];
        }

        $response = wp_remote_get($image_url, [
                'timeout' => REMOTE_IMAGE_TIMEOUT,
                'limit_response_size' => REMOTE_IMAGE_MAX_BYTES,
        ]);

        if (is_wp_error($response)) {
                customiizer_log("❌ Erreur HTTP lors du téléchargement : " . $response->get_error_message());
                return ['success' => false, 'message' => "Téléchargement échoué."];
        }

        $downloaded = wp_remote_retrieve_body($response);
        if (!$downloaded) {
                customiizer_log("❌ Corps vide pour l'image téléchargée : $image_url");
                return ['success' => false, 'message' => "Échec du téléchargement de l'image."];
        }

        $upload_dir = wp_upload_dir();
        $output_dir = $upload_dir['path'];
        $output_filename = uniqid('converted_', true) . '.png';
        $output_path = $output_dir . '/' . $output_filename;

        if ($ext === 'png') {
                if (file_put_contents($output_path, $downloaded) === false) {
                        customiizer_log("❌ Échec de la copie PNG : $output_path");
                        return ['success' => false, 'message' => 'Erreur lors de la copie PNG.'];
                }
        } else {
                $image = imagecreatefromstring($downloaded);
                if (!$image) {
                        customiizer_log("❌ Échec de création GD à partir du fichier téléchargé.");
                        return ['success' => false, 'message' => 'Conversion vers image GD échouée.'];
                }

                $width  = imagesx($image);
                $height = imagesy($image);
                $max_dim = MOCKUP_MAX_DIMENSION;
                if ($width > $max_dim || $height > $max_dim) {
                        $scale      = min($max_dim / $width, $max_dim / $height);
                        $new_width  = (int)($width * $scale);
                        $new_height = (int)($height * $scale);
                        $resized = imagecreatetruecolor($new_width, $new_height);
                        imagealphablending($resized, false);
                        imagesavealpha($resized, true);
                        imagecopyresampled($resized, $image, 0, 0, 0, 0, $new_width, $new_height, $width, $height);
                        imagedestroy($image);
                        $image = $resized;
                }

                if (!imagepng($image, $output_path, PNG_COMPRESSION_LEVEL)) {
                        imagedestroy($image);
                        customiizer_log("❌ Échec de conversion en PNG : $output_path");
                        return ['success' => false, 'message' => "Erreur lors de l'enregistrement PNG."];
                }
                imagedestroy($image);
        }

        $upload_url = $upload_dir['url'];
        $png_url = $upload_url . '/' . $output_filename;
        return [
                'success'   => true,
                'png_url'   => $png_url,
                'file_path' => $output_path
        ];
}
function wait_for_mockup_completion($task_id, $timeout = 120, $interval = 1) {
        $api_key = '4Pyo1mdQ4nDwOSH2WTBaSgFzhgBRYOhd2LRIYsMl';
        $url = "https://api.printful.com/v2/mockup-tasks?id={$task_id}";
        $elapsed_time = 0;
        $start = microtime(true);

	while ($elapsed_time < $timeout) {
		$ch = curl_init($url);
		curl_setopt($ch, CURLOPT_HTTPHEADER, [
			'Content-Type: application/json',
			"Authorization: Bearer $api_key"
		]);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

		$result = curl_exec($ch);
		$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

		if (curl_errno($ch)) {
			$error_msg = curl_error($ch);
			customiizer_log("Erreur cURL lors de la vérification : {$error_msg}");
			curl_close($ch);
			return ['success' => false, 'error' => $error_msg];
		}

		curl_close($ch);

		// Analyse de la réponse
		if ($httpCode !== 200) {
			customiizer_log("Erreur HTTP lors de la vérification de la tâche : Code {$httpCode}");
			return ['success' => false, 'error' => "Erreur HTTP {$httpCode}"];
		}

		$response = json_decode($result, true);

		if (isset($response['data'][0]['status'])) {
			$status = $response['data'][0]['status'];

			if ($status === 'completed') {
                                $duration = round(microtime(true) - $start, 3);
                                customiizer_log("⏲️ Tâche {$task_id} terminée en {$duration}s");
                                return ['success' => true, 'data' => $response['data'][0]];
			} elseif ($status === 'failed') {
				$failure_reasons = $response['data'][0]['failure_reasons'] ?? 'Non spécifié';
                                customiizer_log("Tâche {$task_id} échouée. Raison : " . json_encode($failure_reasons));
                                $duration = round(microtime(true) - $start, 3);
                                customiizer_log("⏲️ Tâche {$task_id} échouée en {$duration}s");
                                return ['success' => false, 'error' => 'Tâche échouée', 'reasons' => $failure_reasons];
			}
		}

		// Attente avant la prochaine vérification
		sleep($interval);
		$elapsed_time += $interval;

		customiizer_log("Tâche {$task_id} toujours en attente après {$elapsed_time} secondes.");
	}

	// Timeout atteint
        customiizer_log("Timeout atteint pour la tâche {$task_id} après {$timeout} secondes.");
        $duration = round(microtime(true) - $start, 3);
        customiizer_log("⏲️ Tâche {$task_id} terminée en {$duration}s (timeout)");
        return ['success' => false, 'error' => 'Timeout atteint'];
}