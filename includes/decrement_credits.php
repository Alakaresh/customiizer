<?php
function decrement_user_credits() {
    check_ajax_referer('decrement_credits_nonce', 'nonce');

    if (!is_user_logged_in()) {
        wp_send_json_error(['message' => 'Utilisateur non connecté']);
        return;
    }

    $current_user_id = get_current_user_id();
    $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : $current_user_id;

    if ($user_id === 0) {
        wp_send_json_error(['message' => 'Invalid user ID']);
        return;
    }

    if ($user_id !== $current_user_id && !current_user_can('manage_options')) {
        wp_send_json_error(['message' => 'Non autorisé']);
        return;
    }

    global $wpdb;
    $table_name = 'WPC_users';
    $result = $wpdb->query(
        $wpdb->prepare("UPDATE {$table_name} SET image_credits = image_credits - 1 WHERE user_id = %d", $user_id)
    );

    if ($result === false) {
        wp_send_json_error(['message' => 'Failed to decrement credits']);
    } else {
        wp_send_json_success(['message' => 'Credits decremented successfully']);
    }
}

add_action('wp_ajax_decrement_credits', 'decrement_user_credits');
