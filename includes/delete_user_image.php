<?php

function customiizer_delete_user_generated_image() {
        if (!is_user_logged_in()) {
                wp_send_json_error([
                        'message' => __('Vous devez être connecté pour supprimer une image.', 'customiizer'),
                ]);
        }

        $image_number = isset($_POST['image_number']) ? intval($_POST['image_number']) : 0;
        if ($image_number <= 0) {
                wp_send_json_error([
                        'message' => __('Identifiant d\'image invalide.', 'customiizer'),
                ]);
        }

        global $wpdb;

        $table_name       = 'WPC_generated_image';
        $current_user_id  = get_current_user_id();

        $image = $wpdb->get_row(
                $wpdb->prepare(
                        "SELECT image_url FROM $table_name WHERE image_number = %d AND user_id = %d",
                        $image_number,
                        $current_user_id
                )
        );

        if (!$image) {
                wp_send_json_error([
                        'message' => __('Image introuvable.', 'customiizer'),
                ]);
        }

        $image_url = $image->image_url;
        $deleted   = $wpdb->delete($table_name, [
                'image_number' => $image_number,
                'user_id'      => $current_user_id,
        ], ['%d', '%d']);

        if (!$deleted) {
                wp_send_json_error([
                        'message' => __('Impossible de supprimer cette image.', 'customiizer'),
                ]);
        }

        // Nettoyage des tables dépendantes
        $wpdb->delete('WPC_image_likes', ['image_id' => $image_number], ['%d']);
        $wpdb->delete('WPC_image_favorites', ['image_id' => $image_number], ['%d']);

        // Tentative de suppression du fichier réel
        if (!empty($image_url)) {
                customiizer_delete_physical_image($image_url);
        }

        wp_send_json_success([
                'message' => __('Image supprimée avec succès.', 'customiizer'),
        ]);
}

function customiizer_delete_physical_image($image_url) {
        $parsed_url = wp_parse_url($image_url);

        // Suppression depuis Azure si l'URL cible le blob storage
        if ($parsed_url && isset($parsed_url['host']) && strpos($parsed_url['host'], 'blob.core.windows.net') !== false) {
                $path      = isset($parsed_url['path']) ? ltrim($parsed_url['path'], '/') : '';
                $parts     = explode('/', $path, 2);
                $container = $parts[0] ?? '';
                $blob      = $parts[1] ?? '';

                if ($container && $blob) {
                        $blobClient = function_exists('azure_get_blob_client') ? azure_get_blob_client() : null;
                        if ($blobClient) {
                                azure_delete_blob($blobClient, $container, $blob);
                        }
                }

                return;
        }

        // Suppression locale : on récupère le chemin relatif au site
        $path = $parsed_url && isset($parsed_url['path']) ? $parsed_url['path'] : $image_url;
        $path = ltrim($path, '/');

        if (empty($path)) {
                return;
        }

        $full_path   = trailingslashit(ABSPATH) . $path;
        $real_path   = realpath($full_path);
        $wp_realpath = realpath(ABSPATH);

        if ($real_path && $wp_realpath && strpos($real_path, $wp_realpath) === 0 && file_exists($real_path)) {
                wp_delete_file($real_path);
        }
}

add_action('wp_ajax_delete_user_generated_image', 'customiizer_delete_user_generated_image');

