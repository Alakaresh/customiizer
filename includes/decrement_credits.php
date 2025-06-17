<?php
function decrement_user_credits() {
    $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
    if ($user_id === 0) {
        wp_send_json_error(['message' => 'Invalid user ID']);
        return;
    }

    global $wpdb;
    $table_name = 'WPC_users'; // Assurez-vous que le nom de la table est correct
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