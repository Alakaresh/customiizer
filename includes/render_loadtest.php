<?php
add_action('wp_ajax_render_loadtest', 'customiizer_handle_render_loadtest');

function customiizer_handle_render_loadtest() {
    $total = isset($_POST['requests']) ? intval($_POST['requests']) : 60;
    if ($total < 1) {
        $total = 1;
    }

    $url = 'https://mockup.customiizer.com/render';
    $variantId = isset($_POST['variantId']) ? intval($_POST['variantId']) : 1320;
    $imageUrl = isset($_POST['imageUrl']) ? esc_url_raw($_POST['imageUrl']) : 'https://customiizer.blob.core.windows.net/imageclient/1/4_54f189c6-4f5f-4cd1-a4b2-ac3fc0d4b21d.webp';

    // Convertit l'image fournie en base64 pour le service de mockup
    $conversion = convert_webp_to_png_server($imageUrl);
    if (!empty($conversion['success']) && !empty($conversion['file_path'])) {
        $image_path   = $conversion['file_path'];
        $image_base64 = base64_encode(file_get_contents($image_path));
        @unlink($image_path);
    } else {
        $msg = $conversion['message'] ?? 'Conversion PNG échouée.';
        wp_send_json_error($msg);
    }

    $payload = json_encode([
        'variantId'   => $variantId,
        'imageBase64' => $image_base64,
    ]);

    $interval = 60 / $total; // seconds between requests
    error_log("Render load test start: variantId=$variantId imageBase64_len=" . strlen($image_base64) . " total=$total interval=" . round($interval, 3) . "s");

    $results = [];
    for ($i = 0; $i < $total; $i++) {
        $start = microtime(true);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);
        $body = curl_exec($ch);
        $duration = (microtime(true) - $start) * 1000;
        $error = curl_errno($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($error || $status < 200 || $status >= 300) {
            $errMsg = $error ? curl_error($ch) : 'HTTP ' . $status;
            if (!$error && $body) {
                $errMsg .= ' - ' . substr($body, 0, 200);
            }
            error_log("Request " . ($i + 1) . " failed: status=$status time=" . round($duration, 2) . "ms error=$errMsg");
            $results[] = [
                'time'   => $duration,
                'ok'     => false,
                'status' => $status,
                'error'  => $errMsg,
            ];
        } else {
            error_log("Request " . ($i + 1) . " ok: status=$status time=" . round($duration, 2) . "ms");
            $results[] = [
                'time'   => $duration,
                'ok'     => true,
                'status' => $status,
            ];
        }

        curl_close($ch);

        $elapsed = microtime(true) - $start;
        $sleep = $interval - $elapsed;
        if ($i < $total - 1 && $sleep > 0) {
            usleep((int)($sleep * 1e6));
        }
    }

    $times = array_column($results, 'time');
    $avg = $times ? array_sum($times) / count($times) : 0;
    $fails = count(array_filter($results, fn($r) => !$r['ok']));

    error_log("Render load test completed: avg=" . round($avg, 2) . "ms failures=$fails");
    wp_send_json_success([
        'results' => $results,
        'average_ms' => $avg,
        'failures' => $fails,
    ]);
}
