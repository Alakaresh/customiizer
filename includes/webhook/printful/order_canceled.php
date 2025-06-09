<?php

function handle_order_canceled(array $data, PrintfulWebhookLogger $logger)
{
    $external_id = $data['data']['order']['external_id'] ?? 'unknown';
    $logger->log("🚫 Event: order_canceled reçu - External ID: $external_id");

    // ➔ Plus tard ici : remboursement interne, annulation WooCommerce, etc.

    return new WP_REST_Response(['status' => 'order_canceled handled'], 200);
}
