<?php

function handle_shipment_sent(array $data, PrintfulWebhookLogger $logger)
{
	$external_id = $data['data']['order']['external_id'] ?? 'unknown';
	$logger->log("📦 Event shipment_sent reçu - External ID: $external_id");

	// Extraire les infos de tracking
	$shipment = $data['data']['shipment'] ?? [];
	$tracking_number = $shipment['tracking_number'] ?? '';
	$tracking_url    = $shipment['tracking_url'] ?? '';
	$shipped_at      = $shipment['shipped_at'] ?? '';

	$logger->log("🚚 Numéro de suivi : $tracking_number");
	$logger->log("🔗 URL de tracking : $tracking_url");
	$logger->log("📅 Expédié le : $shipped_at");

	// 🔥 Supprimer les images temporaires (comme déjà vu précédemment)
	if (str_starts_with($external_id, 'PF')) {
		$numero_commande = (string) substr($external_id, 2);

		global $wpdb;
		$post_id = $wpdb->get_var( $wpdb->prepare(
			"SELECT post_id FROM {$wpdb->prefix}postmeta WHERE meta_key = '_order_number' AND meta_value = %s LIMIT 1",
			$numero_commande
		));

		if ($post_id) {
			$logger->log("✅ Commande Woo trouvée par numéro #$numero_commande → ID WP = $post_id");
			$order = wc_get_order($post_id);
		} else {
			$logger->log("❌ Aucune commande Woo trouvée avec le numéro : $numero_commande");
			return new WP_REST_Response(['error' => 'order_not_found'], 404);
		}

		// 🔥 Supprimer les fichiers temporaires
		$upload = wp_upload_dir();
		$upload_dir = trailingslashit($upload['basedir']) . 'converted';
		$files = glob($upload_dir . "/PF{$numero_commande}_*.png");
		foreach ($files as $file) {
			@unlink($file);
			$logger->log("🧹 Fichier supprimé : $file");
		}

		// 🎯 Mise à jour de la commande WooCommerce
		if ($order) {
			$order->update_meta_data('_printful_tracking_number', $tracking_number);
			$order->update_meta_data('_printful_tracking_url', $tracking_url);
			$order->update_meta_data('_printful_shipped_at', $shipped_at);

			$order->add_order_note("📦 Commande expédiée via Printful\nTracking: $tracking_number\nURL: $tracking_url");
			$order->update_status('expediee', 'Mise à jour via webhook Printful');
			$order->save();

			$logger->log("✅ Commande #$numero_commande mise à jour avec les infos Printful");
		}
	}


	return new WP_REST_Response(['status' => 'shipment_sent handled + order updated'], 200);
}
