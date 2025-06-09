<?php
function check_image_status() {
    customiizer_log('Appel à check_image_status');

    // Récupérer le hash depuis la requête AJAX
    $task_hash = isset($_POST['hash']) ? sanitize_text_field($_POST['hash']) : '';

	customiizer_log('task_hash: ' . $task_hash);
    if (empty($task_hash)) {
        wp_send_json_error(array('message' => 'Hash manquant'));
        customiizer_log('Erreur: Hash manquant');
        return;
    }

    customiizer_log('Hash reçu: ' . $task_hash);

    // Rechercher le post basé sur le hash
    $args = array(
        'post_type' => 'image_task',
        'meta_query' => array(
            array(
                'key' => 'task_hash',
                'value' => $task_hash,
                'compare' => '='
            )
        )
    );

    $query = new WP_Query($args);

    if ($query->have_posts()) {
        $query->the_post();
        $post_id = get_the_ID();
        
        // Récupérer les métadonnées
        $webhook_data = get_post_meta($post_id, 'image_generation', true);
        
        wp_reset_postdata(); // Reset the global $post object

        if ($webhook_data) {
            customiizer_log('Statut récupéré: ' . json_encode($webhook_data));
            wp_send_json_success($webhook_data);
        } else {
            customiizer_log('Aucune donnée trouvée pour le post avec le hash ' . $task_hash);
            wp_send_json_error(array('message' => 'Aucune donnée trouvée pour ce hash'));
        }
    } else {
        customiizer_log('Aucun post trouvé pour le hash ' . $task_hash);
        wp_send_json_error(array('message' => 'Aucun post trouvé pour ce hash'));
    }

    customiizer_log('Réponse envoyée avec succès');
}

add_action('wp_ajax_check_image_status', 'check_image_status');
add_action('wp_ajax_nopriv_check_image_status', 'check_image_status');


function check_image_choices() {
    customiizer_log('Appel à check_image_choices');

    $task_hash = isset($_POST['hash']) ? sanitize_text_field($_POST['hash']) : '';

    if (empty($task_hash)) {
        wp_send_json_error(array('message' => 'Hash manquant'));
        customiizer_log('Erreur: Hash manquant');
        return;
    }

    customiizer_log('Hash reçu: ' . $task_hash);

    // Rechercher le post basé sur le hash
    $args = array(
        'post_type' => 'image_task',
        'meta_query' => array(
            array(
                'key' => 'task_hash',
                'value' => $task_hash,
                'compare' => '='
            )
        )
    );

    $query = new WP_Query($args);

    if ($query->have_posts()) {
        $query->the_post();
        $post_id = get_the_ID();
        customiizer_log("Post existant trouvé: $post_id");

        // Récupérer les métadonnées pour les choix d'images
        $choices = array();
        for ($i = 1; $i <= 4; $i++) {
            $choices["image_choice_$i"] = get_post_meta($post_id, "image_choice_$i", true);
        }

        wp_reset_postdata(); // Reset the global $post object

        customiizer_log('Choix récupérés: ' . print_r($choices, true));
        wp_send_json_success($choices);
    } else {
        customiizer_log('Aucun post trouvé pour le hash ' . $task_hash);
        wp_send_json_error(array('message' => 'Aucun post trouvé pour ce hash'));
    }

    customiizer_log('Réponse envoyée avec succès');
}

add_action('wp_ajax_check_image_choices', 'check_image_choices');
add_action('wp_ajax_nopriv_check_image_choices', 'check_image_choices');

function delete_image_task() {
    customiizer_log('Appel à delete_image_task');

    // Récupérer le hash depuis la requête AJAX
    $task_hash = isset($_POST['hash']) ? sanitize_text_field($_POST['hash']) : '';

    if (empty($task_hash)) {
        wp_send_json_error(array('message' => 'Hash manquant'));
        customiizer_log('Erreur: Hash manquant');
        return;
    }

    customiizer_log('Hash reçu pour suppression: ' . $task_hash);

    // Rechercher le post basé sur le hash
    $args = array(
        'post_type' => 'image_task',
        'meta_query' => array(
            array(
                'key' => 'task_hash',
                'value' => $task_hash,
                'compare' => '='
            )
        )
    );

    $query = new WP_Query($args);

    if ($query->have_posts()) {
        $query->the_post();
        $post_id = get_the_ID();

        // Supprimer le post
        wp_delete_post($post_id, true);

        customiizer_log('Post supprimé: ' . $post_id);
        wp_send_json_success(array('message' => 'Post supprimé avec succès'));
    } else {
        customiizer_log('Aucun post trouvé pour le hash ' . $task_hash);
        wp_send_json_error(array('message' => 'Aucun post trouvé pour ce hash'));
    }

    customiizer_log('Réponse de suppression envoyée avec succès');
}

add_action('wp_ajax_delete_image_task', 'delete_image_task');
add_action('wp_ajax_nopriv_delete_image_task', 'delete_image_task');
