<?php
add_action('rest_api_init', function () {
	register_rest_route('customiizer/v1', '/printful-hook', [
		'methods'             => 'POST',
		'callback'            => 'customiizer_handle_printful_webhook',
                'permission_callback' => 'customiizer_api_permission',
	]);
});

function customiizer_handle_printful_webhook(WP_REST_Request $request) {
	require_once __DIR__ . '/PrintfulWebhookLogger.php';
	if (!class_exists('PrintfulWebhookLogger')) {
		die('Logger manquant');
	}

	$logger = new PrintfulWebhookLogger(__DIR__ . '/printful_webhook_received.log');

	$secret_key = defined('PRINTFUL_API_KEY') ? PRINTFUL_API_KEY : ''; // 🔒 Remplace par ta clé API Printful

	if (empty($secret_key)) {
		$logger->log("❌ Clé API Printful absente !");
		return new WP_REST_Response(['error' => 'Missing secret key'], 500);
	}

	$body = file_get_contents('php://input'); // Le vrai body brut
	$headers = getallheaders(); // Toutes les entêtes

	$received_signature = $headers['X-Printful-Signature'] ?? null;

	if ($received_signature) {
		$calculated_signature = hash_hmac('sha256', $body, $secret_key);
		$logger->log("🔐 Signature reçue : $received_signature");
		$logger->log("🔐 Signature calculée : $calculated_signature");

		if (!hash_equals($received_signature, $calculated_signature)) {
			$logger->log("🚫 Signature invalide, webhook ignoré");
			return new WP_REST_Response(['error' => 'Invalid signature'], 403);
		}

		$logger->log("✅ Signature valide, traitement du webhook");
	} else {
		$logger->log("⚠️ Aucune signature reçue — webhook accepté sans validation (mode développeur ?)");
	}


	$data = json_decode($body, true);
	if (!is_array($data) || !isset($data['type'])) {
		$logger->log("⚠️ Webhook invalide ou sans type");
		return new WP_REST_Response(['status' => 'ignored'], 200);
	}

	$eventType = $data['type'];
	$logger->log("📌 Type d'événement détecté : $eventType");

	$handlerFile = __DIR__ . "/{$eventType}.php";
	if (file_exists($handlerFile)) {
		require_once $handlerFile;
		$functionName = "handle_" . $eventType;

		if (function_exists($functionName)) {
			return $functionName($data, $logger);
		} else {
			$logger->log("❌ Fonction $functionName inexistante dans $handlerFile");
		}
	} else {
		$logger->log("❔ Aucun fichier trouvé pour $eventType");
	}

	return new WP_REST_Response(['status' => 'ignored'], 200);
}
