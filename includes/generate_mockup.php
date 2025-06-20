<?php
require_once __DIR__ . '/printful_rate_limit.php';

function generate_mockup_printful($image_url, $product_id, $variant_id, $style_id, $placement, $technique, $width, $height, $top, $left) {
        if (!defined('PRINTFUL_API_KEY')) {
                return ['success' => false, 'error' => 'Missing PRINTFUL_API_KEY'];
        }

        $api_key  = PRINTFUL_API_KEY;
        $base_url = defined('PRINTFUL_API_BASE') ? PRINTFUL_API_BASE : 'https://api.printful.com/v2';
        $url      = $base_url . '/mockup-tasks';
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

        // Données envoyées à Printful, désactivé pour éviter de surcharger les logs
        // customiizer_log("🔹 Envoi des données Printful : " . json_encode($data, JSON_PRETTY_PRINT));

        $ch = curl_init($url);
        $headers = [
                'Content-Type: application/json',
                "Authorization: Bearer $api_key"
        ];
        if (defined('PRINTFUL_STORE_ID')) {
                $headers[] = 'X-PF-Store-Id: ' . PRINTFUL_STORE_ID;
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

        $quota = printful_rate_limit_status();
        $remain = $quota['remaining'];
        $reset  = $quota['reset'];
        customiizer_log("\xE2\x9E\xA1\xEF\xB8\x8F Appel API Printful pour la t\xC3\xA2che de mockup (reste {$remain}, r\xC3\xA9init dans {$reset}s)");

        list($result, $httpCode) = printful_curl_exec($ch);

        if (curl_errno($ch)) {
                $error_msg = curl_error($ch);
                curl_close($ch);
                return ['success' => false, 'error' => $error_msg];
        }

	curl_close($ch);

        customiizer_log("API Printful HTTP Code: {$httpCode}");

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
        $total = round(microtime(true) - $overall_start, 3);
        customiizer_log("⏱️ Génération échouée en {$total}s");
        wp_send_json_error(['message' => 'URL de l\'image manquante.']);
    }

    // 🔍 Log brut pour contrôle (désactivé car trop verbeux)
    // customiizer_log("📥 Données POST reçues : " . json_encode($_POST, JSON_PRETTY_PRINT));

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
                                                // unable to delete temporary file
                                        }
                                        $total = round(microtime(true) - $overall_start, 3);
                                        customiizer_log("⏱️ Génération terminée en {$total}s");
                                        wp_send_json_success(['mockup_url' => $mockup_url]);
                                } else {
                                        if (!unlink($file_path)) {
                                                // unable to delete temporary file
                                        }
                                        $total = round(microtime(true) - $overall_start, 3);
                                        customiizer_log("⏱️ Génération échouée en {$total}s");
                                        wp_send_json_error(['message' => 'URL du mockup introuvable.']);
                                }
                        } else {
                                if (!unlink($file_path)) {
                                        // unable to delete temporary file
                                }
                                $total = round(microtime(true) - $overall_start, 3);
                                customiizer_log("⏱️ Génération échouée en {$total}s");
                                wp_send_json_error(['message' => 'Aucun mockup généré.']);
                        }
                } else {
                        if (!unlink($file_path)) {
                                // unable to delete temporary file
                        }
                        $total = round(microtime(true) - $overall_start, 3);
                        customiizer_log("⏱️ Génération échouée en {$total}s");
                        wp_send_json_error(['message' => $mockup_status['error']]);
                }
        } else {
                if (!unlink($file_path)) {
                        // unable to delete temporary file
                }
                $total = round(microtime(true) - $overall_start, 3);
                customiizer_log("⏱️ Génération échouée en {$total}s");
                wp_send_json_error(['message' => $response['error'] ?? 'Erreur inconnue']);
        }
}
function convert_webp_to_png_server($image_url) {
        $ext = strtolower(pathinfo(parse_url($image_url, PHP_URL_PATH), PATHINFO_EXTENSION));

        $downloaded = file_get_contents($image_url);
        if ($downloaded === false) {
                return ['success' => false, 'message' => "Échec du téléchargement de l'image."];
        }

        $upload_dir = wp_upload_dir();
        $output_dir = $upload_dir['path'];
        $output_filename = uniqid('converted_', true) . '.png';
        $output_path = $output_dir . '/' . $output_filename;

        if ($ext === 'png') {
                if (file_put_contents($output_path, $downloaded) === false) {
                        return ['success' => false, 'message' => 'Erreur lors de la copie PNG.'];
                }
        } else {
                $image = imagecreatefromstring($downloaded);
                if (!$image) {
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
        if (!defined('PRINTFUL_API_KEY')) {
                return ['success' => false, 'error' => 'Missing PRINTFUL_API_KEY'];
        }

        $api_key  = PRINTFUL_API_KEY;
        $base_url = defined('PRINTFUL_API_BASE') ? PRINTFUL_API_BASE : 'https://api.printful.com/v2';
        $url      = "$base_url/mockup-tasks?id={$task_id}";
        $elapsed_time = 0;
        $start = microtime(true);

        while ($elapsed_time < $timeout) {
                $ch = curl_init($url);
                $quota = printful_rate_limit_status();
                $remain = $quota['remaining'];
                $reset  = $quota['reset'];
                customiizer_log("\xE2\x9E\xA1\xEF\xB8\x8F Vérification du statut de la tâche {$task_id} (reste {$remain}, r\xC3\xA9init dans {$reset}s)");
                $headers = [
                        'Content-Type: application/json',
                        "Authorization: Bearer $api_key"
                ];
                if (defined('PRINTFUL_STORE_ID')) {
                        $headers[] = 'X-PF-Store-Id: ' . PRINTFUL_STORE_ID;
                }
                curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

                list($result, $httpCode) = printful_curl_exec($ch);

                if (curl_errno($ch)) {
                        $error_msg = curl_error($ch);
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