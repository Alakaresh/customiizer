<?php
function get_all_generated_images() {
    $onlyCurrentUser = false;

    if (isset($_POST['user'])) {
        $rawUser = wp_unslash($_POST['user']);
        if (is_string($rawUser)) {
            $normalized = strtolower($rawUser);
            $onlyCurrentUser = in_array($normalized, ['1', 'true', 'yes'], true);
        } else {
            $onlyCurrentUser = !empty($rawUser);
        }
    }

    $queryArgs = [
        'order_by' => 'image_date',
        'order'    => 'DESC',
    ];

    if ($onlyCurrentUser) {
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Authentification requise'], 401);
        }

        $queryArgs['user_id'] = get_current_user_id();
    }

    $images = customiizer_fetch_generated_images($queryArgs);

    if (!empty($images)) {
        wp_send_json($images);
    } else {
        wp_send_json_error(['message' => 'No images found'], 404);
    }

    wp_die();
}

add_action('wp_ajax_nopriv_get_all_generated_images', 'get_all_generated_images');
add_action('wp_ajax_get_all_generated_images', 'get_all_generated_images');
