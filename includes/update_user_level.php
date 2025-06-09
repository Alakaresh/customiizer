<?php
// Sécuriser l'accès en s'assurant que le script est appelé depuis WordPress
if (!defined('ABSPATH')) exit;

function update_user_level() {
    global $wpdb; // Cet objet global permet d'accéder à la base de données de WordPress

    // Vérifier les permissions de l'utilisateur ou d'autres conditions
    if (!is_user_logged_in()) {
        wp_send_json_error(array('message' => 'User not logged in'));
        return;
    }

    $userId = isset($_POST['userId']) ? intval($_POST['userId']) : 0;

    if ($userId === 0) {
        wp_send_json_error(array('message' => 'Invalid user ID'));
        return;
    }

    // Mise à jour de la base de données
    $table_name = 'WPC_client';
    $result = $wpdb->update(
        $table_name,
        array('level' => 1), // nouvelles valeurs, force level à 1
        array('user_id' => $userId) // conditions de la mise à jour
    );

    if ($result === false) {
        wp_send_json_error(array('message' => 'Database update failed'));
    } else {
        wp_send_json_success(array('message' => 'User level updated to 1 successfully'));
    }

    wp_die(); // Arrête l'exécution du script
}

add_action('wp_ajax_update_user_level', 'update_user_level');