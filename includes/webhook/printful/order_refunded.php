<?php

function handle_order_refunded(array $data, PrintfulWebhookLogger $logger)
{
    $external_id = $data['data']['order']['external_id'] ?? 'unknown';
    $logger->log("💸 Event: order_refunded reçu - External ID: $external_id");

    // ➔ Plus tard ici : envoyer note de crédit, mise à jour facture, etc.

    return new WP_REST_Response(['status' => 'order_refunded handled'], 200);
}
