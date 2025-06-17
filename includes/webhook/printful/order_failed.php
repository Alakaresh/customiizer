<?php

function handle_order_failed(array $data, PrintfulWebhookLogger $logger)
{
    $external_id = $data['data']['order']['external_id'] ?? 'unknown';
    $logger->log("❌ Event: order_failed reçu - External ID: $external_id");

    // ➔ Plus tard ici : notifier erreur, relancer, etc.

    return new WP_REST_Response(['status' => 'order_failed handled'], 200);
}
