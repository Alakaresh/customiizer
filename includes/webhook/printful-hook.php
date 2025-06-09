<?php
add_action('rest_api_init', function () {
    register_rest_route('customiizer/v1', '/printful-hook', [
        'methods'             => 'POST',
        'callback'            => 'customiizer_handle_printful_webhook',
        'permission_callback' => '__return_true',
    ]);
});

function customiizer_handle_printful_webhook(WP_REST_Request $request) {
    $log_file = __DIR__ . '/printful_webhook_received.log';

    $body = $request->get_body();
    file_put_contents($log_file, date('c') . " - 📥 Webhook reçu\n", FILE_APPEND);
    file_put_contents($log_file, "📦 Contenu brut : $body\n", FILE_APPEND);

    $data = json_decode($body, true);
    if (! is_array($data) || ($data['type'] ?? '') !== 'shipment_sent') {
        file_put_contents($log_file, "ℹ️ Webhook ignoré ou données invalides\n\n", FILE_APPEND);
        return new WP_REST_Response(['status' => 'ignored'], 200);
    }

    $external_id = $data['data']['order']['external_id'] ?? '';
    file_put_contents($log_file, "🔍 Type = shipment_sent, external_id = $external_id\n", FILE_APPEND);

    if (str_starts_with($external_id, 'PF')) {
        $order_id = substr($external_id, 2); // e.g. "18919"

        // → UTILISATION DE wp_upload_dir() AU LIEU DU THEME
        $upload = wp_upload_dir();
        // /var/www/.../wp-content/uploads/converted
        $upload_dir = trailingslashit( $upload['basedir'] ) . 'converted';
        // URL publique éventuelle : $upload['baseurl'] . '/converted'

        // Assure-toi que le dossier existe
        if ( ! is_dir( $upload_dir ) ) {
            wp_mkdir_p( $upload_dir );
            file_put_contents($log_file, "📁 Création du dossier : $upload_dir\n", FILE_APPEND);
        }

        // On cherche tous les fichiers démarrant par PF<order_id>_
        $pattern = $upload_dir . "/PF{$order_id}_*.png";
        file_put_contents($log_file, "🔎 Recherche des fichiers (pattern: $pattern)\n", FILE_APPEND);

        $files = glob($pattern);
        if ($files) {
            foreach ($files as $file) {
                // pour debug
                file_put_contents($log_file, "📋 Existe avant suppression ? " . (file_exists($file) ? 'oui' : 'non') . "\n", FILE_APPEND);
                file_put_contents($log_file, "✏️ Writable ? " . (is_writable($file) ? 'oui' : 'non') . "\n", FILE_APPEND);

                $res = @unlink($file);
                file_put_contents($log_file, "🔨 unlink retourné : " . var_export($res, true) . "\n", FILE_APPEND);
                file_put_contents($log_file, "💥 error_get_last : " . print_r(error_get_last(), true) . "\n", FILE_APPEND);

                file_put_contents($log_file, "🧹 Image temporaire supprimée : $file\n", FILE_APPEND);
            }
        } else {
            file_put_contents($log_file, "⚠️ Aucun fichier trouvé pour l'ID $order_id\n", FILE_APPEND);
        }
    }

    return new WP_REST_Response(['status' => 'ok'], 200);
}
