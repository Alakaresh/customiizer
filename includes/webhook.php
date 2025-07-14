<?php

add_action('rest_api_init', function () {
    register_rest_route('customiizer/v1', '/webhook/', array(
        'methods' => 'POST',
        'callback' => 'handle_customiizer_webhook',
        'permission_callback' => 'customiizer_api_permission',
    ));
});

function handle_customiizer_webhook(WP_REST_Request $request) {
    $content = $request->get_body();
    $webhookData = json_decode($content);

    if (isset($webhookData->type)) {
        switch ($webhookData->type) {
            case 'shipment_sent':
                customiizer_log('Traitement du webhook pour envoi de commande.');

                $external_order_id = str_replace("PF", "", $webhookData->data->order->external_id);
                $tracking_number = $webhookData->data->shipment->tracking_number;

                $order = wc_get_order($external_order_id);

                if ($order) {
                    customiizer_log("Commande $external_order_id trouvée, mise à jour des informations de suivi...");
                    $order->update_meta_data('tracking_info', $tracking_number);
                    $order->save();
                    customiizer_log("Informations de suivi mises à jour pour la commande $external_order_id : $tracking_number");
                } else {
                    customiizer_log("Erreur : Commande avec ID externe $external_order_id non trouvée.");
                }
                break;

            case 'order_updated':
                customiizer_log('Début du traitement de la mise à jour de commande.');

                if (isset($webhookData->data->order->external_id) && isset($webhookData->data->order->status)) {
                    $order_id = str_replace("PF", "", $webhookData->data->order->external_id);
                    $status = $webhookData->data->order->status;

                    customiizer_log("Données reçues : ID de commande = $order_id, Statut = $status");

                    $order = wc_get_order($order_id);

                    if ($order) {
                        customiizer_log("Commande $order_id trouvée, mise à jour du statut en cours...");

                        $wc_status = '';
                        switch ($status) {
                            case 'canceled':
                                $wc_status = 'cancelled';
                                break;
                            // Ajoute d'autres conversions selon tes besoins
                        }

                        if (!empty($wc_status)) {
                            $order->update_status($wc_status, 'Mise à jour via webhook.', true);
                            customiizer_log("Commande $order_id mise à jour avec succès. Nouveau statut : $wc_status");
                        } else {
                            customiizer_log("Statut reçu non reconnu ou non géré : $status");
                        }
                    } else {
                        customiizer_log("Erreur : Commande $order_id non trouvée.");
                    }
                } else {
                    customiizer_log("Erreur : Données du webhook incomplètes pour la mise à jour de la commande.");
                }
                break;

            case 'order_created':
                customiizer_log('Début du traitement de la création de commande.');

                if (isset($webhookData->data->order->external_id)) {
                    $order_id = str_replace("PF", "", $webhookData->data->order->external_id);

                    customiizer_log("Données reçues pour la création : ID de commande = $order_id");

                    $order = wc_get_order($order_id);

                    if ($order) {
                        customiizer_log("Commande $order_id trouvée, mise à jour du statut en cours...");

                        $order->update_status('pending', 'Mise à jour via webhook : création de la commande.', true);
                        customiizer_log("Commande $order_id mise à jour avec succès. Nouveau statut : pending");
                    } else {
                        customiizer_log("Erreur : Commande $order_id non trouvée pour la mise à jour du statut en 'pending'.");
                    }
                } else {
                    customiizer_log("Erreur : Données du webhook incomplètes pour la création de la commande.");
                }
                break;

            default:
                customiizer_log("Événement webhook non reconnu : " . print_r($webhookData, true));
                break;
        }
    }

    return new WP_REST_Response(['status' => 'success', 'message' => 'Webhook received successfully'], 200);
}
