<?php

function handle_mockup_task_finished(array $data, PrintfulWebhookLogger $logger)
{
    $logger->log('🖼️ Event: mockup_task_finished reçu');

    $payload = $data['data'] ?? [];

    // Compatibilité avec différentes structures possibles
    if (isset($payload['task'])) {
        $task = $payload['task'];
        $catalog_variant_mockups = $task['catalog_variant_mockups'] ?? [];
    } elseif (isset($payload[0]['catalog_variant_mockups'])) {
        $catalog_variant_mockups = $payload[0]['catalog_variant_mockups'];
    } else {
        $catalog_variant_mockups = $payload['catalog_variant_mockups'] ?? [];
    }

    if (empty($catalog_variant_mockups)) {
        $logger->log('⚠️ Aucun mockup trouvé dans le webhook');
        return new WP_REST_Response(['status' => 'no_mockups'], 200);
    }

    global $wpdb;

    foreach ($catalog_variant_mockups as $variant) {
        $variant_id = $variant['catalog_variant_id'] ?? 0;
        if (!$variant_id) {
            $logger->log('⚠️ catalog_variant_id manquant, entrée ignorée');
            continue;
        }

        $logger->log("➡️ Mise à jour du variant $variant_id");

        foreach ($variant['mockups'] ?? [] as $mock) {
            $mockup_id  = $mock['mockup_id'] ?? 0;
            $mockup_url = $mock['mockup_url'] ?? '';

            if (!$mockup_url) {
                $logger->log("⚠️ mockup_url manquant pour variant $variant_id");
                continue;
            }

            $logger->log("💾 mockup_id=$mockup_id url=$mockup_url");

            $wpdb->replace(
                'WPC_variant_mockup',
                [
                    'variant_id'    => $variant_id,
                    'mockup_id'     => $mockup_id,
                    'image'         => $mockup_url,
                    'position_top'  => 0,
                    'position_left' => 50,
                ],
                ['%d','%d','%s','%d','%d']
            );
        }
    }

    return new WP_REST_Response(['status' => 'mockup_task_finished handled'], 200);
}
