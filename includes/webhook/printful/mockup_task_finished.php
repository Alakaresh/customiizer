<?php

function handle_mockup_task_finished(array $data, PrintfulWebhookLogger $logger)
{
    $logger->log('📥 Webhook reçu : mockup_task_finished');

    // 🔒 Sécurité : on s'assure que le webhook vient bien de notre boutique
    if (($data['store_id'] ?? 0) !== 15816776) {
        $logger->log("❌ Webhook rejeté : store_id non autorisé ({$data['store_id']})");
        return new WP_REST_Response(['error' => 'invalid_store'], 403);
    }

    // 📝 Log complet du payload reçu
    $logger->log("📦 Contenu complet :\n" . print_r($data, true));

    // 📌 Extraction du payload
    $payload = $data['data'] ?? [];

    // 📌 Affichage du task_id si dispo
    $task_id = $payload['id'] ?? ($payload['task']['id'] ?? null);
    if ($task_id) {
        $logger->log("🔢 Tâche concernée : task_id = $task_id");
    }

    // 📦 Récupération des mockups quelle que soit la structure
    if (isset($payload['task'])) {
        $catalog_variant_mockups = $payload['task']['catalog_variant_mockups'] ?? [];
    } elseif (isset($payload[0]['catalog_variant_mockups'])) {
        $catalog_variant_mockups = $payload[0]['catalog_variant_mockups'];
    } else {
        $catalog_variant_mockups = $payload['catalog_variant_mockups'] ?? [];
    }

    if (empty($catalog_variant_mockups)) {
        $logger->log('⚠️ Aucun mockup trouvé dans le webhook');
        return new WP_REST_Response(['status' => 'no_mockups'], 200);
    }

    // 🔄 Parcours des variantes et mockups associés
    foreach ($catalog_variant_mockups as $variant) {
        $variant_id = $variant['catalog_variant_id'] ?? 0;
        if (!$variant_id) {
            $logger->log('⚠️ catalog_variant_id manquant, entrée ignorée');
            continue;
        }

        $logger->log("🎯 Variant ID : $variant_id");

        foreach ($variant['mockups'] ?? [] as $mock) {
            $mockup_id  = $mock['mockup_id'] ?? 'inconnu';
            $mockup_url = $mock['mockup_url'] ?? 'url manquante';
            $style_id   = $mock['style_id'] ?? 'style inconnu';

            $logger->log("🔗 mockup_id = $mockup_id | style_id = $style_id | url = $mockup_url");
        }
    }

    return new WP_REST_Response(['status' => 'mockup_task_finished traité (logué uniquement)'], 200);
}
