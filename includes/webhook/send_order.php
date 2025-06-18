<?php
// send_order.php - Version fiable avec reconnexion auto + heartbeat

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

function startConsumerLoop() {
	global $callback;

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
				10.0
			);
			$channel = $connection->channel();
			$channel->queue_declare(QUEUE_NAME, false, true, false, false);
			$channel->basic_consume(QUEUE_NAME, '', false, false, false, false, 'handleMessage');

			customiizer_log("👂 Connexion RabbitMQ active — en attente de messages");

			while ($channel->is_consuming()) {
				try {
					$channel->wait();
				} catch (AMQPTimeoutException $e) {
					customiizer_log("⏳ Timeout RabbitMQ : " . $e->getMessage());
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

$callback = function(AMQPMessage &$msg) {
	$commande = json_decode($msg->body, true);
	customiizer_log("🔎 Dump de la commande : " . json_encode($commande));
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

// ——— Envoi du payload à Printful ———
function envoyer_commande_printful(array $payload): bool {
	customiizer_log("📤 Envoi à Printful");
	customiizer_log("   Payload: " . json_encode($payload));

        $ch = curl_init(PRINTFUL_API_BASE . '/orders');
        curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HEADER         => true,
                CURLOPT_POST           => true,
                CURLOPT_HTTPHEADER     => [
                        'Content-Type: application/json',
                        'Authorization: Bearer ' . PRINTFUL_API_KEY,
                        'X-PF-Store-Id: ' . PRINTFUL_STORE_ID,
                ],
                CURLOPT_POSTFIELDS     => json_encode($payload),
        ]);

        printful_throttle();
        $raw  = curl_exec($ch);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $headersStr = substr($raw, 0, $headerSize);
        $resp = substr($raw, $headerSize);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (preg_match('/X-Ratelimit-Remaining:\s*(\d+)/i', $headersStr, $m)) {
                printful_adjust_tokens((int)$m[1]);
        }

	customiizer_log("📬 HTTP $code, réponse: $resp");
	return ($code >= 200 && $code < 300);
}

// ——— Téléchargement d'une image temporaire ———
function simple_download_url(string $url): ?string {
	$tmp = tempnam(sys_get_temp_dir(), 'webp_');
	$fp  = fopen($tmp, 'w+');
	if (!$fp) {
		customiizer_log("❌ open tmp file failed");
		return null;
	}

	$ch = curl_init($url);
	curl_setopt_array($ch, [
		CURLOPT_FILE           => $fp,
		CURLOPT_TIMEOUT        => 30,
		CURLOPT_FOLLOWLOCATION => true,
		CURLOPT_FAILONERROR    => true,
	]);

	$ok = curl_exec($ch);
	$err = curl_error($ch);
	curl_close($ch);
	fclose($fp);

	if (!$ok) {
		unlink($tmp);
		customiizer_log("❌ curl error: $err");
		return null;
	}
	return $tmp;
}

// ——— Conversion WebP → PNG, stockage et URL publique ———
function convertir_webp_en_png(string $webp_url, string $order_id): ?string {
	customiizer_log("⏬ Download WebP: $webp_url");
	$tmp_webp = simple_download_url($webp_url);
	if (!$tmp_webp) {
		customiizer_log("❌ Download failed");
		return null;
	}

	$img = @imagecreatefromwebp($tmp_webp);
	if (!$img) {
		unlink($tmp_webp);
		customiizer_log("❌ imagecreatefromwebp failed");
		return null;
	}

	if (!is_dir(UPLOADS_BASE_PATH)) {
		mkdir(UPLOADS_BASE_PATH, 0755, true);
		customiizer_log("📁 Created upload dir: " . UPLOADS_BASE_PATH);
		chown(UPLOADS_BASE_PATH, 'domcusto');
		chgrp(UPLOADS_BASE_PATH, 'psacln');
	}

	$file_name  = 'PF' . $order_id . '_' . uniqid() . '.png';
	$png_path   = UPLOADS_BASE_PATH . '/' . $file_name;
	$public_url = UPLOADS_BASE_URL  . '/' . $file_name;

        imagepng($img, $png_path);
	imagedestroy($img);
	unlink($tmp_webp);

	chmod($png_path, 0644);
	chown($png_path, 'domcusto');
	chgrp($png_path, 'psacln');

	customiizer_log("✅ PNG saved: $png_path");
	return $public_url;
}

// ——— Préparation du payload ———
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
		customiizer_log("🔍 Produit #$product_id – données meta : " . json_encode($meta));

		if (empty($meta['design_image_url']) || empty($meta['variant_id'])) {
			customiizer_log("⚠️ Données manquantes pour le produit #$product_id");
			continue;
		}

		$url_png = convertir_webp_en_png($meta['design_image_url'], $commande['number']);
		if (!$url_png) {
			customiizer_log("❌ Échec de conversion WebP → PNG pour le produit #$product_id");
			continue;
		}

		customiizer_log("✅ Image convertie : $url_png");

		$items[] = [
			'source'       => 'catalog',
			'variant_id'   => intval($meta['variant_id']),
			'name'         => $item['name'],
			'quantity'     => $item['quantity'],
			'placements'   => [[
				'placement'      => $meta['placement'] ?? 'default',
				'technique'      => $meta['technique'] ?? 'digital',
				'print_area_type'=> 'simple',
				'layers'         => [[
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

	customiizer_log("📦 Commande prête pour Printful avec " . count($items) . " article(s)");

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

// ——— Mail d'alerte ———
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
		$mail->Body    = "Voici la liste mise à jour des commandes ayant échoué deux fois.\n\nMerci de vérifier les cas suivants dans le fichier joint.";
		$mail->addAttachment($filepath, 'commandes_en_echec.txt');
		$mail->send();
		customiizer_log("📧 Mail d'alerte envoyé avec fichier joint");
	} catch (Exception $e) {
		error_log("❌ Échec envoi mail alerte avec pièce jointe : " . $mail->ErrorInfo);
	}
}

// Démarre la boucle principale de consommation
startConsumerLoop($channel);
