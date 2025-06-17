<?php
/**
 * Envoi d'une commande Printful dans RabbitMQ (environnement chargé via wp-config)
 */

function customiizer1_log(string $msg): void {
	$log = __DIR__ . '/created_order.log';
	file_put_contents($log, date('c') . ' - ' . $msg . PHP_EOL, FILE_APPEND);
}

require_once __DIR__ . '/../../vendor/autoload.php';          // Charge les dépendances (PhpAmqpLib)
$wpLoadPath = __DIR__ . '/../../../../../wp-load.php';
if (!file_exists($wpLoadPath)) {
	customiizer1_log("❌ wp-load.php introuvable à $wpLoadPath");
	http_response_code(500);
	exit;
}
require_once $wpLoadPath;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

// 📥 Lecture des données JSON brutes reçues (stdin ou webhook)
$input = file_get_contents('php://input');
$data = json_decode($input, true);
customiizer1_log("📩 Webhook reçu : " . $input);

// ❌ Vérification minimale
if (!isset($data['id'])) {
	customiizer1_log("❌ Webhook invalide : ID de commande manquant.");
	http_response_code(400);
	echo json_encode(['error' => 'Commande invalide']);
	exit;
}

// ❌ Vérification du statut
if (!isset($data['status']) || strtolower($data['status']) !== 'on-hold') {
	customiizer1_log("⏸️ Commande ignorée (statut : " . ($data['status'] ?? 'inconnu') . ")");
	http_response_code(200);
	echo json_encode(['status' => 'ignored', 'reason' => 'not on-hold']);
	exit;
}

// 🔄 Récupération de la configuration (via wp-config)
$host  = RABBIT_HOST;
$port  = RABBIT_PORT;
$user  = RABBIT_USER;
$pass  = RABBIT_PASS;
$queue = QUEUE_NAME;

customiizer1_log("🔗 Connexion à RabbitMQ ($host:$port), file : $queue");

try {
	// 🛜 Connexion RabbitMQ
	$connection = new AMQPStreamConnection($host, $port, $user, $pass);
	$channel = $connection->channel();

	// 📦 Déclaration de la file si elle n'existe pas encore
	$channel->queue_declare($queue, false, true, false, false);

	// ✉️ Création du message
	$msg = new AMQPMessage(json_encode($data), [
		'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT
	]);
	$channel->basic_publish($msg, '', $queue);

	customiizer1_log("✅ Commande #{$data['id']} envoyée dans la file RabbitMQ : $queue");

	// 🔚 Fermeture
	$channel->close();
	$connection->close();

	http_response_code(200);
	echo json_encode(['status' => 'ok']);
} catch (Exception $e) {
	customiizer1_log("❌ Erreur RabbitMQ : " . $e->getMessage());
	http_response_code(500);
	echo json_encode(['error' => 'RabbitMQ error']);
}
