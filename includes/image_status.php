<?php
function check_image_status() {

    // Récupérer le hash depuis la requête AJAX
    $task_hash = isset($_POST['hash']) ? sanitize_text_field($_POST['hash']) : '';
    customiizer_log('image_status', "check_image_status appelé pour hash={$task_hash}");

    if (empty($task_hash)) {
        customiizer_log('image_status', 'Hash manquant pour check_image_status');
        wp_send_json_error(array('message' => 'Hash manquant'));
        return;
    }


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
        customiizer_log('image_status', "Post trouvé {$post_id} pour hash={$task_hash}");

        // Récupérer les métadonnées
        $webhook_data = get_post_meta($post_id, 'image_generation', true);

        wp_reset_postdata(); // Reset the global $post object

        if ($webhook_data) {
            customiizer_log('image_status', 'Données de génération récupérées avec succès');
            wp_send_json_success($webhook_data);
        } else {
            customiizer_log('image_status', 'Aucune donnée de génération trouvée');
            wp_send_json_error(array('message' => 'Aucune donnée trouvée pour ce hash'));
        }
    } else {
        customiizer_log('image_status', 'Aucun post trouvé pour ce hash');
        wp_send_json_error(array('message' => 'Aucun post trouvé pour ce hash'));
    }

}

add_action('wp_ajax_check_image_status', 'check_image_status');
add_action('wp_ajax_nopriv_check_image_status', 'check_image_status');


function check_image_choices() {

    $task_hash = isset($_POST['hash']) ? sanitize_text_field($_POST['hash']) : '';
    customiizer_log('image_status', "check_image_choices appelé pour hash={$task_hash}");

    if (empty($task_hash)) {
        customiizer_log('image_status', 'Hash manquant pour check_image_choices');
        wp_send_json_error(array('message' => 'Hash manquant'));
        return;
    }


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
        customiizer_log('image_status', "Post trouvé {$post_id} pour check_image_choices");

        // Récupérer les métadonnées pour les choix d'images
        $choices = array();
        for ($i = 1; $i <= 4; $i++) {
            $choices["image_choice_$i"] = get_post_meta($post_id, "image_choice_$i", true);
        }

        wp_reset_postdata(); // Reset the global $post object

        customiizer_log('image_status', 'Choix renvoyés : ' . json_encode($choices));
        wp_send_json_success($choices);
    } else {
        customiizer_log('image_status', 'Aucun post trouvé pour ce hash (choices)');
        wp_send_json_error(array('message' => 'Aucun post trouvé pour ce hash'));
    }

}

add_action('wp_ajax_check_image_choices', 'check_image_choices');
add_action('wp_ajax_nopriv_check_image_choices', 'check_image_choices');

function delete_image_task() {

    // Récupérer le hash depuis la requête AJAX
    $task_hash = isset($_POST['hash']) ? sanitize_text_field($_POST['hash']) : '';
    customiizer_log('image_status', "delete_image_task appelé pour hash={$task_hash}");

    if (empty($task_hash)) {
        customiizer_log('image_status', 'Hash manquant pour delete_image_task');
        wp_send_json_error(array('message' => 'Hash manquant'));
        return;
    }


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
        customiizer_log('image_status', "Suppression du post {$post_id} pour hash={$task_hash}");

        // Supprimer le post
        wp_delete_post($post_id, true);

        customiizer_log('image_status', "Post {$post_id} supprimé");
        wp_send_json_success(array('message' => 'Post supprimé avec succès'));
    } else {
        customiizer_log('image_status', 'Aucun post trouvé pour ce hash (delete)');
        wp_send_json_error(array('message' => 'Aucun post trouvé pour ce hash'));
    }

}

add_action('wp_ajax_delete_image_task', 'delete_image_task');
add_action('wp_ajax_nopriv_delete_image_task', 'delete_image_task');
