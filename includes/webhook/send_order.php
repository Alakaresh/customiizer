<?php
// send_order.php - Version robuste (RabbitMQ heartbeat + reconnexion DB + cycle limité)

require_once __DIR__ . '/../../vendor/autoload.php';
$wpLoadPath = __DIR__ . '/../../../../../wp-load.php';
if (!file_exists($wpLoadPath)) {
    customiizer_log("❌ wp-load.php introuvable à $wpLoadPath");
    exit(1);
}
require_once $wpLoadPath;

foreach (['PRINTFUL_API_KEY', 'PRINTFUL_STORE_ID', 'PRINTFUL_API_BASE', 'RABBIT_HOST', 'QUEUE_NAME'] as $const) {
    if (!defined($const)) {
        die("❌ Constante manquante : $const\n");
    }
}

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use PhpAmqpLib\Exception\AMQPTimeoutException;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// === PARAMÈTRES DU WORKER ===
const MAX_MESSAGES = 100;    // nb max de messages avant restart
const MAX_RUNTIME  = 1800;   // 30 min max avant restart volontaire

function startConsumerLoop() {
    global $callback;

    $startTime   = time();
    $msgCount    = 0;

    while (true) {
        try {
            $connection = new AMQPStreamConnection(
                RABBIT_HOST,
                RABBIT_PORT,
                RABBIT_USER,
                RABBIT_PASS,
                '/',
                false,
                'AMQPLAIN',
                null,
                'en_US',
                10.0,    // connexion timeout
                10.0,    // read_write timeout
                null,
                true,    // keepalive
                30       // heartbeat en secondes
            );

            $channel = $connection->channel();
            $channel->queue_declare(QUEUE_NAME, false, true, false, false);
            $channel->basic_consume(QUEUE_NAME, '', false, false, false, false, 'handleMessage');

            customiizer_log("👂 Connexion RabbitMQ active — en attente de messages");

            while ($channel->is_consuming()) {
                try {
                    $channel->wait(null, false, 5); // 5s pour éviter blocage infini
                    $msgCount++;

                    // Vérifie limites
                    if ($msgCount >= MAX_MESSAGES || (time() - $startTime) >= MAX_RUNTIME) {
                        customiizer_log("⏹ Limite atteinte ($msgCount messages, " . (time() - $startTime) . "s) → arrêt volontaire");
                        $channel->close();
                        $connection->close();
                        exit(0);
                    }

                } catch (AMQPTimeoutException $e) {
                    // Simple keepalive → rien reçu (silencieux pour éviter le bruit de log)
                }
            }
        } catch (\Throwable $e) {
            customiizer_log("❌ Erreur dans la boucle principale : " . $e->getMessage());
            sleep(5);
        }

        try { $channel?->close(); } catch (\Throwable) {}
        try { $connection?->close(); } catch (\Throwable) {}

        customiizer_log("🔄 Tentative de reconnexion dans 5 secondes...");
        sleep(5);
    }
}

function handleMessage(AMQPMessage &$msg) {
    global $callback;
    $callback($msg);
}

// === CALLBACK PRINCIPAL ===
$callback = function(AMQPMessage &$msg) {
    global $wpdb;

    // 🔄 Vérifie connexion DB avant traitement
    if (!$wpdb->check_connection(false)) {
        customiizer_log("🔄 Reconnexion MySQL...");
        $wpdb->db_connect();
    }

    $commande = json_decode($msg->body, true);
    customiizer_log("📥 Received order #{$commande['number']}");

    $payload = preparer_commande_pour_printful($commande);
    $ok = envoyer_commande_printful($payload);

    $order_id = $commande['number'];
    $fail_path = sys_get_temp_dir() . "/pf_fail_{$order_id}.txt";
    $fail_count = file_exists($fail_path) ? intval(file_get_contents($fail_path)) : 0;

    if ($ok) {
        $msg->ack();
        @unlink($fail_path);
        @unlink(__DIR__ . "/pf_alert_sent_{$order_id}.txt");
        customiizer_log("✅ Order sent and acked");
    } else {
        $fail_count++;
        file_put_contents($fail_path, $fail_count);
        customiizer_log("⚠️ Failed to send (attempt $fail_count), message not acked");

        $alert_path = __DIR__ . "/alertes_commandes.txt";
        $alert_line = "Commande #$order_id échouée deux fois";
        $already_listed = file_exists($alert_path) && strpos(file_get_contents($alert_path), $alert_line) !== false;

        if ($fail_count >= 2) {
            if (!$already_listed) {
                customiizer_log("🚨 2 échecs pour la commande $order_id — ajout au fichier d'alerte");
                file_put_contents($alert_path, $alert_line . "\n", FILE_APPEND);
                send_failure_alert_email_with_file($alert_path);
            } else {
                customiizer_log("ℹ️ Commande #$order_id déjà signalée, pas de nouvel envoi d'alerte");
            }
        } else {
            $msg->nack(false, true);
        }
    }
};

// === Envoi du payload à Printful ===
function envoyer_commande_printful(array $payload): bool {
    customiizer_log("📤 Envoi à Printful");

    $ch = curl_init(PRINTFUL_API_BASE . '/orders');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . PRINTFUL_API_KEY,
            'X-PF-Store-Id: ' . PRINTFUL_STORE_ID,
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload),
    ]);

    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    customiizer_log("📬 HTTP $code, réponse: $resp");
    return ($code >= 200 && $code < 300);
}

// === Conversion WebP → PNG si besoin ===
if (!function_exists('convert_webp_to_png_server')) {
    require_once __DIR__ . '/../generate_mockup.php';
}

function ensure_png_for_order(string $source): string {
    $looks_like_data_uri = stripos($source, 'data:image/') === 0 || strpos($source, ';base64,') !== false;

    if ($looks_like_data_uri) {
        customiizer_log('Printful', 'Conversion base64 → PNG détectée pour un design.');
        $result = convert_webp_to_png_server($source);
        if (!empty($result['success']) && !empty($result['png_url'])) {
            return $result['png_url'];
        }

        $message = $result['message'] ?? 'motif inconnu';
        customiizer_log('Printful', 'Échec conversion base64 → PNG: ' . $message);
        return $source;
    }

    $parts = wp_parse_url($source);
    if (!$parts) {
        customiizer_log('Printful', 'URL de design invalide, impossible de convertir.');
        return $source;
    }

    $ext = strtolower(pathinfo($parts['path'] ?? '', PATHINFO_EXTENSION));
    if ($ext === 'png') {
        return $source;
    }

    $result = convert_webp_to_png_server($source);
    if (!empty($result['success']) && !empty($result['png_url'])) {
        return $result['png_url'];
    }

    $message = $result['message'] ?? 'motif inconnu';
    customiizer_log('Printful', 'Échec conversion URL → PNG: ' . $message);
    return $source;
}

/**
 * Récupère les dimensions de zone d'impression en pixels et en pouces pour un variant donné.
 */
function get_variant_print_dimensions(int $variant_id): array {
    static $cache = [];

    if (isset($cache[$variant_id])) {
        return $cache[$variant_id];
    }

    global $wpdb;

    $template = $wpdb->get_row(
        $wpdb->prepare(
            'SELECT print_area_width, print_area_height FROM WPC_variant_templates WHERE variant_id = %d LIMIT 1',
            $variant_id
        ),
        ARRAY_A
    ) ?: [];

    $print = $wpdb->get_row(
        $wpdb->prepare(
            'SELECT print_area_width, print_area_height FROM WPC_variant_print WHERE variant_id = %d LIMIT 1',
            $variant_id
        ),
        ARRAY_A
    ) ?: [];

    $cache[$variant_id] = [
        'area_width_px'  => isset($template['print_area_width']) ? floatval($template['print_area_width']) : 0.0,
        'area_height_px' => isset($template['print_area_height']) ? floatval($template['print_area_height']) : 0.0,
        'area_width_in'  => isset($print['print_area_width']) ? floatval($print['print_area_width']) : 0.0,
        'area_height_in' => isset($print['print_area_height']) ? floatval($print['print_area_height']) : 0.0,
    ];

    return $cache[$variant_id];
}

/**
 * Convertit les métadonnées de placement (en pixels) vers les unités attendues par Printful (pouces).
 */
function normalize_design_position_for_printful(array $meta, int $variant_id): array {
    $position = [
        'width'  => max(0.0, floatval($meta['design_width']  ?? 0)),
        'height' => max(0.0, floatval($meta['design_height'] ?? 0)),
        'top'    => max(0.0, floatval($meta['design_top']    ?? 0)),
        'left'   => max(0.0, floatval($meta['design_left']   ?? 0)),
    ];

    $dims = get_variant_print_dimensions($variant_id);

    $areaWidthIn  = $dims['area_width_in'];
    $areaHeightIn = $dims['area_height_in'];
    $areaWidthPx  = $dims['area_width_px'];
    $areaHeightPx = $dims['area_height_px'];

    $scaleX = ($areaWidthPx > 0 && $areaWidthIn > 0) ? ($areaWidthIn / $areaWidthPx) : null;
    $scaleY = ($areaHeightPx > 0 && $areaHeightIn > 0) ? ($areaHeightIn / $areaHeightPx) : null;

    if ($scaleX !== null) {
        $position['width'] = round($position['width'] * $scaleX, 4);
        $position['left']  = round($position['left']  * $scaleX, 4);
    }

    if ($scaleY !== null) {
        $position['height'] = round($position['height'] * $scaleY, 4);
        $position['top']    = round($position['top']    * $scaleY, 4);
    }

    if ($areaWidthIn > 0) {
        $position['width'] = min($position['width'], $areaWidthIn);
        $maxLeft = max(0.0, $areaWidthIn - $position['width']);
        $position['left'] = min(max(0.0, $position['left']), $maxLeft);
    }

    if ($areaHeightIn > 0) {
        $position['height'] = min($position['height'], $areaHeightIn);
        $maxTop = max(0.0, $areaHeightIn - $position['height']);
        $position['top'] = min(max(0.0, $position['top']), $maxTop);
    }

    if (($scaleX === null || $scaleY === null) && ($areaWidthIn > 0 || $areaHeightIn > 0)) {
        customiizer_log(
            'Printful',
            sprintf(
                '⚠️ Conversion px→pouces incomplète pour variant_id=%d (scaleX=%s, scaleY=%s)',
                $variant_id,
                var_export($scaleX, true),
                var_export($scaleY, true)
            )
        );
    }

    $position['area_width']  = $areaWidthIn;
    $position['area_height'] = $areaHeightIn;

    return $position;
}

// === Préparation commande Printful ===
function preparer_commande_pour_printful(array $commande): array {
    $items = [];
    foreach ($commande['line_items'] as $item) {
        $product_id = $item['product_id'];
        $meta = [
            'design_image_url' => get_post_meta($product_id, 'design_image_url', true),
            'design_width'     => get_post_meta($product_id, 'design_width', true),
            'design_height'    => get_post_meta($product_id, 'design_height', true),
            'design_left'      => get_post_meta($product_id, 'design_left', true),
            'design_top'       => get_post_meta($product_id, 'design_top', true),
            'variant_id'       => get_post_meta($product_id, 'variant_id', true),
            'placement'        => get_post_meta($product_id, 'placement', true),
            'technique'        => get_post_meta($product_id, 'technique', true)
        ];

        if (empty($meta['design_image_url']) || empty($meta['variant_id'])) {
            customiizer_log("⚠️ Données manquantes pour le produit #$product_id");
            continue;
        }

        $url_png = ensure_png_for_order($meta['design_image_url']);

        $variant_id = intval($meta['variant_id']);
        $position = normalize_design_position_for_printful($meta, $variant_id);

        $items[] = [
            'source'       => 'catalog',
            'variant_id'   => $variant_id,
            'name'         => $item['name'],
            'quantity'     => $item['quantity'],
            'placements'   => [[
                'placement'       => $meta['placement'] ?? 'default',
                'technique'       => $meta['technique'] ?? 'digital',
                'print_area_type' => 'simple',
                'layers'          => [[
                    'type'     => 'file',
                    'url'      => $url_png,
                    'position' => $position,
                ]]
            ]]
        ];
    }

    $b = $commande['billing'];

    return [
        'external_id' => ENV_PREFIX . $commande['number'],
        'recipient'   => [
            'name'         => trim($b['first_name'].' '.$b['last_name']),
            'address1'     => $b['address_1'],
            'city'         => $b['city'],
            'zip'          => $b['postcode'],
            'country_code' => $b['country'],
            'phone'        => $b['phone'],
            'email'        => $b['email'],
        ],
        'order_items' => $items,
    ];
}

// === Mail d'alerte ===
function send_failure_alert_email_with_file(string $filepath): void {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = 'ssl';
        $mail->Port       = SMTP_PORT;
        $mail->setFrom(SMTP_FROM, SMTP_FROM_NAME);
        $mail->addAddress(SMTP_TO);
        $mail->Subject = "🚨 Commandes Printful en échec";
        $mail->Body    = "Voici la liste mise à jour des commandes ayant échoué deux fois.\n\nMerci de vérifier.";
        $mail->addAttachment($filepath, 'commandes_en_echec.txt');
        $mail->send();
        customiizer_log("📧 Mail d'alerte envoyé avec fichier joint");
    } catch (Exception $e) {
        error_log("❌ Échec envoi mail alerte : " . $mail->ErrorInfo);
    }
}

// === Lancer le worker ===
startConsumerLoop();
