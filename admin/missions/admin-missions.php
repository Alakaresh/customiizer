<?php
add_action('admin_menu', function () {
    add_menu_page(
        'Gestion des missions',
        'Missions',
        'manage_options',
        'customiizer-missions',
        'customiizer_render_missions_page',
        'dashicons-awards',
        3
    );
});

function customiizer_render_missions_page() {
    if (!current_user_can('manage_options')) return;
    global $wpdb;

    if (isset($_POST['customiizer_add_mission'])) {
        check_admin_referer('customiizer_add_mission');
        $wpdb->insert('WPC_missions', [
            'title'         => sanitize_text_field($_POST['title'] ?? ''),
            'description'   => sanitize_textarea_field($_POST['description'] ?? ''),
            'goal'          => intval($_POST['goal'] ?? 1),
            'points_reward' => intval($_POST['points'] ?? 0),
            'is_active'     => 1
        ], ['%s','%s','%d','%d','%d']);
        echo '<div class="updated notice"><p>Mission créée.</p></div>';
    }

    if (isset($_POST['disable_mission'])) {
        $id = intval($_POST['mission_id']);
        $wpdb->update('WPC_missions', ['is_active' => 0], ['mission_id' => $id]);
    } elseif (isset($_POST['enable_mission'])) {
        $id = intval($_POST['mission_id']);
        $wpdb->update('WPC_missions', ['is_active' => 1], ['mission_id' => $id]);
    }

    $missions = $wpdb->get_results('SELECT * FROM WPC_missions', ARRAY_A);

    echo '<div class="wrap"><h1>🎯 Missions</h1>';
    echo '<h2>Ajouter une mission</h2>';
    echo '<form method="post">';
    wp_nonce_field('customiizer_add_mission');
    echo '<table class="form-table">';
    echo '<tr><th scope="row">Titre</th><td><input type="text" name="title" required></td></tr>';
    echo '<tr><th scope="row">Description</th><td><textarea name="description" rows="3"></textarea></td></tr>';
    echo '<tr><th scope="row">Objectif</th><td><input type="number" name="goal" value="1" min="1"></td></tr>';
    echo '<tr><th scope="row">Points</th><td><input type="number" name="points" value="0" min="0"></td></tr>';
    echo '</table>';
    echo '<p><input type="submit" class="button button-primary" name="customiizer_add_mission" value="Ajouter"></p>';
    echo '</form>';

    echo '<h2>Missions existantes</h2>';
    echo '<table class="widefat striped"><thead><tr><th>ID</th><th>Titre</th><th>Objectif</th><th>Points</th><th>Active</th><th>Action</th></tr></thead><tbody>';
    foreach ($missions as $m) {
        echo '<tr>';
        echo '<td>'.intval($m['mission_id']).'</td>';
        echo '<td>'.esc_html($m['title']).'</td>';
        echo '<td>'.intval($m['goal']).'</td>';
        echo '<td>'.intval($m['points_reward']).'</td>';
        echo '<td>'.($m['is_active'] ? 'Oui' : 'Non').'</td>';
        echo '<td><form method="post">';
        echo '<input type="hidden" name="mission_id" value="'.intval($m['mission_id']).'">';
        if ($m['is_active']) {
            echo '<button type="submit" name="disable_mission" class="button">Désactiver</button>';
        } else {
            echo '<button type="submit" name="enable_mission" class="button">Activer</button>';
        }
        echo '</form></td>';
        echo '</tr>';
    }
    echo '</tbody></table></div>';
}
