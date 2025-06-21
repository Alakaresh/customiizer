<?php

function handle_mockup_task_finished(array $data, PrintfulWebhookLogger $logger)
{
    $logger->log('📥 Webhook reçu : mockup_task_finished');

    // 🔒 Vérification du store_id (sécurité)
    if (($data['store_id'] ?? 0) !== 15816776) {
        $logger->log("❌ Webhook rejeté : store_id non autorisé ({$data['store_id']})");
        return new WP_REST_Response(['error' => 'invalid_store'], 403);
    }

    // 📝 Log du contenu complet reçu
    $logger->log("📦 Contenu complet :\n" . print_r($data, true));

    // 📌 Extraction du payload principal
    $payload = $data['data'] ?? [];

    // 🔢 Tâche ID si présent
    $task_id = $payload['id'] ?? ($payload['task']['id'] ?? null);
    if ($task_id) {
        $logger->log("🔢 Tâche concernée : task_id = $task_id");
        customiizer_delete_mockup_file($task_id, $logger);
    }

    // 📦 Extraction des mockups
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

    $results = [];

    // 🔄 Parcours des variantes et mockups
    foreach ($catalog_variant_mockups as $variant) {
        $variant_id = intval($variant['catalog_variant_id'] ?? 0);
        if (!$variant_id) {
            $logger->log('⚠️ catalog_variant_id manquant, entrée ignorée');
            continue;
        }

        $logger->log("🎯 Variant ID : $variant_id");

        foreach ($variant['mockups'] ?? [] as $mock) {
            $style_id   = intval($mock['style_id'] ?? 0);
            $mockup_url = $mock['mockup_url'] ?? '';

            // ✅ On considère style_id comme identifiant du mockup
            $logger->log("🔗 style_id = $style_id (équivalent mockup_id) | url = $mockup_url");

            $results[] = [
                'variant_id' => $variant_id,
                'style_id'   => $style_id,
                'mockup_url' => $mockup_url,
            ];
        }
    }

    if ($task_id) {
        set_transient('customiizer_mockup_result_' . $task_id, $results, MINUTE_IN_SECONDS * 30);
    }

    return new WP_REST_Response(['status' => 'mockup_task_finished processed'], 200);
}
