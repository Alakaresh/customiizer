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
                    // Simple keepalive → rien reçu
                    customiizer_log("⏳ Timeout RabbitMQ, pas de message");
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

function ensure_png_for_order(string $url): string {
    $parts = wp_parse_url($url);
    $ext   = strtolower(pathinfo($parts['path'] ?? '', PATHINFO_EXTENSION));
    if ($ext === 'png') {
        return $url;
    }

    $result = convert_webp_to_png_server($url);
    return $result['success'] ? $result['png_url'] : $url;
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

        $items[] = [
            'source'       => 'catalog',
            'variant_id'   => intval($meta['variant_id']),
            'name'         => $item['name'],
            'quantity'     => $item['quantity'],
            'placements'   => [[
                'placement'       => $meta['placement'] ?? 'default',
                'technique'       => $meta['technique'] ?? 'digital',
                'print_area_type' => 'simple',
                'layers'          => [[
                    'type'     => 'file',
                    'url'      => $url_png,
                    'position' => [
                        'width'  => floatval($meta['design_width']),
                        'height' => floatval($meta['design_height']),
                        'top'    => floatval($meta['design_top']),
                        'left'   => floatval($meta['design_left']),
                    ]
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
