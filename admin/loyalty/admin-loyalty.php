<?php
add_action('admin_menu', function () {
    add_menu_page(
        'Custompoints',
        'Custompoints',
        'manage_options',
        'customiizer-loyalty',
        'customiizer_render_loyalty_page',
        'dashicons-star-filled',
        3
    );
});

function customiizer_render_loyalty_page() {
    if (!current_user_can('manage_options')) return;
    $tab = $_GET['tab'] ?? 'missions';
    echo '<div class="wrap">';
    echo '<h1>✨ Custompoints</h1>';
    echo '<h2 class="nav-tab-wrapper">';
    $tabs = array(
        'missions' => 'Missions',
        'logs'     => 'Logs',
        'points'   => 'Points'
    );
    foreach ($tabs as $slug => $label) {
        $class = ($slug === $tab) ? ' nav-tab-active' : '';
        $url = admin_url('admin.php?page=customiizer-loyalty&tab='.$slug);
        echo '<a href="'.esc_url($url).'" class="nav-tab'.$class.'">'.esc_html($label).'</a>';
    }
    echo '</h2>';

    switch ($tab) {
        case 'logs':
            customiizer_render_loyalty_logs();
            break;
        case 'points':
            customiizer_render_loyalty_points();
            break;
        default:
            customiizer_render_loyalty_missions();
    }
    echo '</div>';
}

function customiizer_render_loyalty_missions() {
    if (!current_user_can('manage_options')) return;
    global $wpdb;

    if (isset($_POST['customiizer_add_mission'])) {
        check_admin_referer('customiizer_add_mission');
        $wpdb->insert('WPC_missions', [
            'title'         => sanitize_text_field($_POST['title'] ?? ''),
            'description'   => sanitize_textarea_field($_POST['description'] ?? ''),
            'goal'          => intval($_POST['goal'] ?? 1),
            'points_reward' => intval($_POST['points'] ?? 0),
            'category'      => sanitize_text_field($_POST['category'] ?? ''),
            'trigger_action'=> sanitize_text_field($_POST['trigger_action'] ?? ''),
            'is_active'     => 1
        ], ['%s','%s','%d','%d','%s','%s','%d']);
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

    echo '<h2>Ajouter une mission</h2>';
    echo '<form method="post">';
    wp_nonce_field('customiizer_add_mission');
    echo '<table class="form-table">';
    echo '<tr><th scope="row">Titre</th><td><input type="text" name="title" required></td></tr>';
    echo '<tr><th scope="row">Description</th><td><textarea name="description" rows="3"></textarea></td></tr>';
    echo '<tr><th scope="row">Objectif</th><td><input type="number" name="goal" value="1" min="1"></td></tr>';
    echo '<tr><th scope="row">Points</th><td><input type="number" name="points" value="0" min="0"></td></tr>';
    $actions = customiizer_get_mission_actions();
    $action_options = '';
    foreach ($actions as $value => $label) {
        $action_options .= '<option value="'.esc_attr($value).'">'.esc_html($label).'</option>';
    }
    echo '<tr><th scope="row">Catégorie</th><td><input type="text" name="category"></td></tr>';
    echo '<tr><th scope="row">Action</th><td><select name="trigger_action">'.$action_options.'</select></td></tr>';
    echo '</table>';
    echo '<p><input type="submit" class="button button-primary" name="customiizer_add_mission" value="Ajouter"></p>';
    echo '</form>';

    echo '<h2>Missions existantes</h2>';
    echo '<table class="widefat striped"><thead><tr><th>ID</th><th>Titre</th><th>Objectif</th><th>Points</th><th>Catégorie</th><th>Déclencheur</th><th>Active</th><th>Action</th></tr></thead><tbody>';
    foreach ($missions as $m) {
        echo '<tr>';
        echo '<td>'.intval($m['mission_id']).'</td>';
        echo '<td>'.esc_html($m['title']).'</td>';
        echo '<td>'.intval($m['goal']).'</td>';
        echo '<td>'.intval($m['points_reward']).'</td>';
        echo '<td>'.esc_html($m['category']).'</td>';
        echo '<td>'.esc_html($m['trigger_action']).'</td>';
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
    echo '</tbody></table>';
}

function customiizer_render_loyalty_logs() {
    global $wpdb;
    $logs = $wpdb->get_results("SELECT * FROM WPC_loyalty_log ORDER BY id DESC LIMIT 50", ARRAY_A);
    echo '<h2>Derniers mouvements</h2>';
    echo '<table class="widefat striped"><thead><tr><th>ID</th><th>Utilisateur</th><th>Points</th><th>Type</th><th>Origine</th><th>Description</th><th>Date</th></tr></thead><tbody>';
    foreach ($logs as $l) {
        echo '<tr>';
        echo '<td>'.intval($l['id']).'</td>';
        echo '<td>'.intval($l['user_id']).'</td>';
        echo '<td>'.intval($l['points']).'</td>';
        echo '<td>'.esc_html($l['type']).'</td>';
        echo '<td>'.esc_html($l['origin']).'</td>';
        echo '<td>'.esc_html($l['description']).'</td>';
        echo '<td>'.esc_html($l['created_at']).'</td>';
        echo '</tr>';
    }
    echo '</tbody></table>';
}

function customiizer_render_loyalty_points() {
    if (isset($_POST['adjust_points'])) {
        check_admin_referer('customiizer_adjust_points');
        $user_id = intval($_POST['user_id'] ?? 0);
        $amount  = intval($_POST['amount'] ?? 0);
        $origin  = sanitize_text_field($_POST['origin'] ?? 'admin');
        $desc    = sanitize_text_field($_POST['description'] ?? 'Ajout manuel');
        if ($user_id && $amount) {
            if ($amount > 0) {
                customiizer_add_loyalty_points($user_id, $amount, $origin, $desc);
            } else {
                customiizer_use_loyalty_points($user_id, -$amount, $origin, $desc);
            }
            echo '<div class="updated notice"><p>Points mis à jour.</p></div>';
        }
    }
    echo '<h2>Ajuster les points</h2>';
    echo '<form method="post">';
    wp_nonce_field('customiizer_adjust_points');
    echo '<table class="form-table">';
    echo '<tr><th scope="row">User ID</th><td><input type="number" name="user_id" required></td></tr>';
    echo '<tr><th scope="row">Quantité (+/-)</th><td><input type="number" name="amount" required></td></tr>';
    echo '<tr><th scope="row">Origine</th><td><input type="text" name="origin" value="admin"></td></tr>';
    echo '<tr><th scope="row">Description</th><td><input type="text" name="description" value=""></td></tr>';
    echo '</table>';
    echo '<p><input type="submit" class="button button-primary" name="adjust_points" value="Mettre à jour"></p>';
    echo '</form>';
}
?>
