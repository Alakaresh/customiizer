<?php
require_once __DIR__ . '/../../printful_rate_limit.php';

function handle_order_created(array $data, PrintfulWebhookLogger $logger)
{
	$external_id = $data['data']['order']['external_id'] ?? 'unknown';
	$logger->log("🆕 Event: order_created reçu - External ID: $external_id");

	if (!str_starts_with($external_id, 'PF')) {
		$logger->log("⚠️ Format de external_id non reconnu : $external_id");
		return new WP_REST_Response(['error' => 'invalid external_id format'], 400);
	}

	// 🔐 Extraire le numéro de commande séquentiel (ex: "001005")
	$numero_commande = (string) substr($external_id, 2);

	// 🔎 Recherche de la commande par numéro
	global $wpdb;
	$post_id = $wpdb->get_var($wpdb->prepare(
		"SELECT post_id FROM {$wpdb->prefix}postmeta WHERE meta_key = '_order_number' AND meta_value = %s LIMIT 1",
		$numero_commande
	));

	if (!$post_id) {
		$logger->log("❌ Aucune commande Woo trouvée avec le numéro : $numero_commande");
		return new WP_REST_Response(['error' => 'order_not_found'], 404);
	}

	$order = wc_get_order($post_id);

	if (!$order) {
		$logger->log("❌ Commande Woo introuvable pour ID WP : $post_id");
		return new WP_REST_Response(['error' => 'order_invalid'], 404);
	}

	$logger->log("✅ Commande Woo trouvée : #$numero_commande → ID WP = $post_id");

	// 🗒️ Ajouter une note de suivi
	$order->add_order_note("🖨️ Commande mise en production via Printful");

	// 🔄 Mettre à jour le statut
	$order->update_status('en-production', 'Mise à jour automatique via webhook Printful');
	$order->save();

	$logger->log("✅ Statut mis à jour vers en-production");

	// ✅ Confirmer automatiquement la commande Printful
	//$printful_order_id = $data['data']['order']['id'] ?? null;

	if ($printful_order_id) {
		$confirmation = confirm_printful_order($printful_order_id, $logger);
		$logger->log($confirmation['message']);
	} else {
		$logger->log("❌ ID Printful manquant, confirmation impossible");
	}

	return new WP_REST_Response(['status' => 'order_created handled'], 200);
}

function confirm_printful_order($orderId, PrintfulWebhookLogger $logger): array
{
	if (!defined('PRINTFUL_API_KEY')) {
		return ['success' => false, 'message' => "❌ Constante PRINTFUL_API_KEY non définie."];
	}

	if (!defined('PRINTFUL_API_BASE')) {
		return ['success' => false, 'message' => "❌ PRINTFUL_API_BASE non défini."];
	}

	$url = PRINTFUL_API_BASE . "/orders/{$orderId}/confirmation";

	$headers = [
		"Authorization: Bearer " . PRINTFUL_API_KEY,
		"Content-Type: application/json"
	];

	if (defined('PRINTFUL_STORE_ID')) {
		$headers[] = "X-PF-Store-Id: " . PRINTFUL_STORE_ID;
	}

	$maxRetries = 5;
	$retryDelay = 5;

	// Liste des erreurs temporaires connues
	$retryableErrors = [
		'calculations still running',
		'design is still processing',
	];

        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
                printful_rate_limit();
                $ch = curl_init($url);
		curl_setopt_array($ch, [
			CURLOPT_CUSTOMREQUEST => "POST",
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_HTTPHEADER => $headers,
		]);

		$response = curl_exec($ch);
		$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		curl_close($ch);

		$decoded = json_decode($response, true);
		$message = $decoded['error']['message'] ?? 'Réponse : ' . $response;

		// ✅ Succès
		if ($httpCode === 200 && isset($decoded['data']['status']) && $decoded['data']['status'] !== 'draft') {
			return ['success' => true, 'message' => "✅ Commande Printful #$orderId confirmée (statut : {$decoded['data']['status']})"];
		}

		$logger->log("❌ Tentative $attempt/$maxRetries - Erreur de confirmation Printful #$orderId : HTTP $httpCode - $message");

		// ⏳ Vérifie si le message contient une erreur temporaire connue
		$shouldRetry = $httpCode === 400 && collect_retryable($message, $retryableErrors);

		if ($shouldRetry && $attempt < $maxRetries) {
			$logger->log("⏳ Attente de $retryDelay secondes avant une nouvelle tentative...");
			sleep($retryDelay);
			continue;
		}

		break;
	}

	return [
		'success' => false,
		'message' => "❌ Confirmation Printful échouée après $maxRetries tentatives. Dernière réponse : $response"
	];
}

function collect_retryable(string $message, array $retryableErrors): bool
{
	$lowerMsg = strtolower($message);
	foreach ($retryableErrors as $pattern) {
		if (str_contains($lowerMsg, $pattern)) return true;
	}
	return false;
}

