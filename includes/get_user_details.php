<?php
function get_user_customiizer() {
    global $wpdb;

    $user_id = get_current_user_id();

    if ($user_id > 0) {
        $table = $wpdb->prefix . 'client'; // → WPC_client
        $query = $wpdb->prepare("SELECT image_credits, level, is_subscribed, email_verified, user_logo, user_banner, crop_x, crop_y, crop_width, crop_height FROM $table WHERE user_id = %d", $user_id);
        $data = $wpdb->get_row($query, ARRAY_A);

        // Optionnel : ajoute aussi user_login ou display_name de wp_users
        $user_info = get_userdata($user_id);
        $data['user_nicename'] = $user_info->user_nicename;
        $data['display_name'] = $user_info->display_name;

        wp_send_json($data);
    } else {
        wp_send_json(array('error' => 'Aucun utilisateur n’est connecté.'));
    }
}

add_action('wp_ajax_get_user_customiizer', 'get_user_customiizer');
