<?php
add_action('wp_ajax_render_loadtest', 'customiizer_handle_render_loadtest');

function customiizer_handle_render_loadtest() {
    $total = 60;
    $url = 'https://mockup.customiizer.com/render';
    $variantId = isset($_POST['variantId']) ? intval($_POST['variantId']) : 1;
    $imageUrl = isset($_POST['imageUrl']) ? esc_url_raw($_POST['imageUrl']) : 'https://customiizer.blob.core.windows.net/imageclient/1/4_54f189c6-4f5f-4cd1-a4b2-ac3fc0d4b21d.webp';
    $payload = json_encode([
        'variantId' => $variantId,
        'imageUrl'  => $imageUrl,
        'imgX' => 0,
        'imgY' => 0,
        'imgW' => 10,
        'imgH' => 10,
    ]);

    $mh = curl_multi_init();
    $handles = [];

    for ($i = 0; $i < $total; $i++) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);
        $handles[] = ['handle' => $ch, 'start' => microtime(true)];
        curl_multi_add_handle($mh, $ch);
    }

    $running = null;
    do {
        curl_multi_exec($mh, $running);
        curl_multi_select($mh);
    } while ($running > 0);

    $results = [];
    foreach ($handles as $info) {
        $ch = $info['handle'];
        $duration = (microtime(true) - $info['start']) * 1000;
        $error = curl_errno($ch);
        if ($error) {
            $results[] = ['time' => $duration, 'ok' => false, 'error' => curl_error($ch)];
        } else {
            $results[] = ['time' => $duration, 'ok' => true];
        }
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);
    }
    curl_multi_close($mh);

    $times = array_column($results, 'time');
    $avg = $times ? array_sum($times) / count($times) : 0;
    $fails = count(array_filter($results, fn($r) => !$r['ok']));

    wp_send_json_success([
        'results' => $results,
        'average_ms' => $avg,
        'failures' => $fails,
    ]);
}
