<?php

add_action('wp_ajax_generate_mockup', 'handle_generate_mockup');
add_action('wp_ajax_nopriv_generate_mockup', 'handle_generate_mockup');

/**
 * Appelle le service de rendu de mockup Customiizer.
 * Reçoit les dimensions en pouces et les convertit en centimètres.
 */
function handle_generate_mockup() {
    $image_url  = sanitize_text_field($_POST['image_url'] ?? '');
    $variant_id = isset($_POST['variant_id']) ? intval($_POST['variant_id']) : 0;
    $width_in   = isset($_POST['width']) ? floatval($_POST['width']) : 0;
    $height_in  = isset($_POST['height']) ? floatval($_POST['height']) : 0;
    $left_in    = isset($_POST['left']) ? floatval($_POST['left']) : 0;
    $top_in     = isset($_POST['top']) ? floatval($_POST['top']) : 0;

    error_log('[Mockup] Params: ' . wp_json_encode([
        'image_url' => $image_url,
        'variant_id' => $variant_id,
        'width_in' => $width_in,
        'height_in' => $height_in,
        'left_in' => $left_in,
        'top_in' => $top_in,
    ]));

    if (!$image_url || !$variant_id) {
        wp_send_json_error(['message' => 'Paramètres manquants.']);
    }

    // Convertit l'image et récupère son contenu en base64 pour l'appel au service externe.
    $conversion = convert_webp_to_png_server($image_url);
    if (!empty($conversion['success']) && !empty($conversion['file_path'])) {
        $image_path   = $conversion['file_path'];
        $image_base64 = base64_encode(file_get_contents($image_path));
        @unlink($image_path);
        error_log('[Mockup] Image convertie en base64');
    } else {
        $message = $conversion['message'] ?? "Conversion PNG échouée.";
        wp_send_json_error(['message' => $message]);
    }

    $payload = [
        'variantId'   => $variant_id,
        'imageBase64' => $image_base64,
        'imgX'        => $left_in * 2.54,
        'imgY'        => $top_in * 2.54,
        'imgW'        => $width_in * 2.54,
        'imgH'        => $height_in * 2.54,
    ];

    error_log('[Mockup] Payload: ' . wp_json_encode($payload));

    $response = wp_remote_post('https://mockup.customiizer.com/render', [
        'headers' => ['Content-Type' => 'application/json'],
        'body'    => wp_json_encode($payload),
        'timeout' => 60,
    ]);

    if (is_wp_error($response)) {
        error_log('[Mockup] HTTP error: ' . $response->get_error_message());
        wp_send_json_error(['message' => $response->get_error_message()]);
    }

    $raw_body = wp_remote_retrieve_body($response);
    error_log('[Mockup] Response: ' . $raw_body);

    $body = json_decode($raw_body, true);
    if (!is_array($body)) {
        error_log('[Mockup] Invalid response');
        wp_send_json_error(['message' => 'Réponse invalide du service de mockup.']);
    }

    // Nouvelle API : retourne plusieurs fichiers
    if (!empty($body['files']) && is_array($body['files'])) {
        $files = [];
        foreach ($body['files'] as $f) {
            if (empty($f['url']) || empty($f['name'])) {
                continue;
            }
            $files[] = [
                'url'  => esc_url_raw($f['url']),
                'name' => sanitize_text_field($f['name'])
            ];
        }
        if ($files) {
            error_log('[Mockup] Success: multiple files');
            wp_send_json_success(['files' => $files]);
        }
    }

    // Ancienne réponse : un seul mockupUrl
    if (!empty($body['mockupUrl'])) {
        $mockup_url = esc_url_raw($body['mockupUrl']);
        error_log('[Mockup] Success: ' . $mockup_url);
        wp_send_json_success([
            'mockup_url' => $mockup_url,
        ]);
    }

    error_log('[Mockup] Invalid response format');
    wp_send_json_error(['message' => 'Réponse invalide du service de mockup.']);
}
function convert_webp_to_png_server($image_url) {
        $parts = wp_parse_url($image_url);
        $ext   = strtolower(pathinfo($parts['path'] ?? '', PATHINFO_EXTENSION));

        if (!$parts || !in_array($parts['scheme'] ?? '', ['http', 'https'], true)) {
                return ['success' => false, 'message' => "URL d'image invalide."];
        }

        if (defined('ALLOWED_IMAGE_HOSTS') && !in_array($parts['host'], ALLOWED_IMAGE_HOSTS, true)) {
                return ['success' => false, 'message' => 'Hôte non autorisé.'];
        }

        $response = wp_remote_get($image_url, [
                'timeout' => REMOTE_IMAGE_TIMEOUT,
                'limit_response_size' => REMOTE_IMAGE_MAX_BYTES,
        ]);

        if (is_wp_error($response)) {
                return ['success' => false, 'message' => "Téléchargement échoué."];
        }

        $downloaded = wp_remote_retrieve_body($response);
        if (!$downloaded) {
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
