<?php

add_action('wp_ajax_generate_mockup_from_canvas', 'handle_generate_mockup_from_canvas');
add_action('wp_ajax_nopriv_generate_mockup_from_canvas', 'handle_generate_mockup_from_canvas');

/**
 * Reçoit une image en base64, l'envoie au service de mockup
 * et renvoie l'URL du mockup généré.
 */
function handle_generate_mockup_from_canvas() {
    $image_base64 = $_POST['image_base64'] ?? '';
    $variant_id   = isset($_POST['variant_id']) ? intval($_POST['variant_id']) : 0;
    $width_in     = isset($_POST['width']) ? floatval($_POST['width']) : 0;
    $height_in    = isset($_POST['height']) ? floatval($_POST['height']) : 0;
    $left_in      = isset($_POST['left']) ? floatval($_POST['left']) : 0;
    $top_in       = isset($_POST['top']) ? floatval($_POST['top']) : 0;

    if (empty($image_base64) || !$variant_id) {
        wp_send_json_error(['message' => 'Paramètres manquants.']);
    }

    $clean = preg_replace('#^data:image/\w+;base64,#i', '', $image_base64);
    $decoded = base64_decode($clean);
    if ($decoded === false) {
        wp_send_json_error(['message' => 'Données base64 invalides.']);
    }

    $payload = [
        'variantId'    => $variant_id,
        'imageBase64'  => $clean,
        'imgX'         => $left_in * 2.54,
        'imgY'         => $top_in * 2.54,
        'imgW'         => $width_in * 2.54,
        'imgH'         => $height_in * 2.54,
    ];

    error_log('[generate_mockup_from_canvas] Payload to mockup service: ' . sprintf('variantId=%d, imageBase64_length=%d, imgX=%.2f, imgY=%.2f, imgW=%.2f, imgH=%.2f',
        $payload['variantId'], strlen($payload['imageBase64']), $payload['imgX'], $payload['imgY'], $payload['imgW'], $payload['imgH']));
    $response = wp_remote_post('https://mockup.customiizer.com/render', [
        'headers' => ['Content-Type' => 'application/json'],
        'body'    => wp_json_encode($payload),
        'timeout' => 60,
    ]);

    if (is_wp_error($response)) {
        wp_send_json_error(['message' => $response->get_error_message()]);
    }

    $raw_body = wp_remote_retrieve_body($response);
    $body = json_decode($raw_body, true);
    if (!is_array($body)) {
        wp_send_json_error(['message' => 'Réponse invalide du service de mockup.']);
    }

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
            wp_send_json_success(['files' => $files]);
        }
    }

    if (!empty($body['mockupUrl'])) {
        $mockup_url = esc_url_raw($body['mockupUrl']);
        wp_send_json_success(['mockup_url' => $mockup_url]);
    }

    wp_send_json_error(['message' => 'Réponse invalide du service de mockup.']);
}
