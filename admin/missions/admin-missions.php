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

    if (isset($_GET['updated'])) {
        echo '<div class="updated notice"><p>Mission mise à jour.</p></div>';
    }

    if (isset($_POST['customiizer_add_mission'])) {
        check_admin_referer('customiizer_add_mission');
        $category = sanitize_text_field($_POST['category'] ?? '');
        if ($category === '__other') {
            $category = sanitize_text_field($_POST['category_custom'] ?? '');
        }
        $wpdb->insert('WPC_missions', [
            'title'         => sanitize_text_field($_POST['title'] ?? ''),
            'description'   => sanitize_textarea_field($_POST['description'] ?? ''),
            'goal'          => intval($_POST['goal'] ?? 1),
            'points_reward' => intval($_POST['points'] ?? 0),
            'category'      => $category,
            'trigger_action'=> sanitize_text_field($_POST['trigger_action'] ?? ''),
            'is_active'     => 1
        ], ['%s','%s','%d','%d','%s','%s','%d']);
        echo '<div class="updated notice"><p>Mission créée.</p></div>';
    }

    if (isset($_POST['customiizer_update_mission'])) {
        check_admin_referer('customiizer_update_mission');
        $id = intval($_POST['mission_id'] ?? 0);
        if ($id) {
            $category = sanitize_text_field($_POST['category'] ?? '');
            if ($category === '__other') {
                $category = sanitize_text_field($_POST['category_custom'] ?? '');
            }
            $wpdb->update('WPC_missions', [
                'title'         => sanitize_text_field($_POST['title'] ?? ''),
                'description'   => sanitize_textarea_field($_POST['description'] ?? ''),
                'goal'          => intval($_POST['goal'] ?? 1),
                'points_reward' => intval($_POST['points'] ?? 0),
                'category'      => $category,
                'trigger_action'=> sanitize_text_field($_POST['trigger_action'] ?? '')
            ], ['mission_id' => $id], ['%s','%s','%d','%d','%s','%s'], ['%d']);
            wp_redirect(add_query_arg('updated', '1', remove_query_arg('edit')));
            exit;

        }
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

    $edit_id = isset($_GET['edit']) ? intval($_GET['edit']) : 0;

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
    foreach ( $actions as $value => $label ) {
        $action_options .= '<option value="'.esc_attr($value).'">'.esc_html($label).'</option>';
    }
    $cat_select  = '<select name="category" id="category-select" class="category-select">';
    $defaults = array('Général','Images','Commandes','Communauté');
    foreach ($defaults as $cat) {
        $cat_select .= '<option value="'.esc_attr($cat).'">'.esc_html($cat).'</option>';
    }
    $cat_select .= '<option value="__other">Autre…</option></select>';
    $cat_select .= ' <input type="text" name="category_custom" id="category-custom" class="category-custom" style="display:none;" />';
    echo '<tr><th scope="row">Catégorie</th><td>'.$cat_select.'</td></tr>';
    echo '<tr><th scope="row">Action</th><td><select name="trigger_action">'.$action_options.'</select></td></tr>';
    echo '</table>';
    echo '<p><input type="submit" class="button button-primary" name="customiizer_add_mission" value="Ajouter"></p>';
    echo '</form>';

    echo '<h2>Missions existantes</h2>';
    echo '<table class="widefat striped"><thead><tr><th>ID</th><th>Titre</th><th>Description</th><th>Objectif</th><th>Points</th><th>Catégorie</th><th>Déclencheur</th><th>Active</th><th>Action</th></tr></thead><tbody>';
    foreach ($missions as $m) {
        $is_edit = ($edit_id === intval($m['mission_id']));
        if ($is_edit) {
            echo '<tr>';
            echo '<form method="post">';
            wp_nonce_field('customiizer_update_mission');
            echo '<td>'.intval($m['mission_id']).'<input type="hidden" name="mission_id" value="'.intval($m['mission_id']).'"></td>';
            echo '<td><input type="text" name="title" value="'.esc_attr($m['title']).'"></td>';
            echo '<td><textarea name="description" rows="3">'.esc_textarea($m['description']).'</textarea></td>';
            echo '<td><input type="number" name="goal" value="'.intval($m['goal']).'" min="1"></td>';
            echo '<td><input type="number" name="points" value="'.intval($m['points_reward']).'" min="0"></td>';
            $defaults = array('Général','Images','Commandes','Communauté');
            $category_options = '';
            foreach ($defaults as $cat) {
                $sel = ($cat === $m['category']) ? ' selected' : '';
                $category_options .= '<option value="'.esc_attr($cat).'"'.$sel.'>'.esc_html($cat).'</option>';
            }
            $other_selected = in_array($m['category'], $defaults) ? '' : ' selected';
            $category_field  = '<select name="category" class="category-select">'.$category_options.'<option value="__other"'.$other_selected.'>Autre…</option></select>';
            $custom_style = $other_selected ? '' : 'style="display:none;"';
            $custom_value = $other_selected ? esc_attr($m['category']) : '';
            $category_field .= ' <input type="text" name="category_custom" class="category-custom" '.$custom_style.' value="'.$custom_value.'">';
            echo '<td>'.$category_field.'</td>';
            $actions = customiizer_get_mission_actions();
            $opts = '';
            foreach ($actions as $v => $l) {
                $sel = ($v === $m['trigger_action']) ? ' selected' : '';
                $opts .= '<option value="'.esc_attr($v).'"'.$sel.'>'.esc_html($l).'</option>';
            }
            echo '<td><select name="trigger_action">'.$opts.'</select></td>';
            echo '<td>'.($m['is_active'] ? 'Oui' : 'Non').'</td>';
            $cancel_url = admin_url('admin.php?page=customiizer-missions');
            echo '<td><input type="submit" class="button button-primary" name="customiizer_update_mission" value="Enregistrer"> ';
            echo '<a href="'.esc_url($cancel_url).'" class="button">Annuler</a></td>';
            echo '</form></tr>';

        } else {
            echo '<tr>';
            echo '<td>'.intval($m['mission_id']).'</td>';
            echo '<td>'.esc_html($m['title']).'</td>';
            echo '<td>'.esc_html($m['description']).'</td>';
            echo '<td>'.intval($m['goal']).'</td>';
            echo '<td>'.intval($m['points_reward']).'</td>';
            echo '<td>'.esc_html($m['category']).'</td>';
            echo '<td>'.esc_html($m['trigger_action']).'</td>';
            echo '<td>'.($m['is_active'] ? 'Oui' : 'Non').'</td>';
            echo '<td><form method="post" style="display:inline">';
            echo '<input type="hidden" name="mission_id" value="'.intval($m['mission_id']).'">';
            if ($m['is_active']) {
                echo '<button type="submit" name="disable_mission" class="button">Désactiver</button>';
            } else {
                echo '<button type="submit" name="enable_mission" class="button">Activer</button>';
            }
            echo '</form> ';
            $edit_url = admin_url('admin.php?page=customiizer-missions&edit='.intval($m['mission_id']));
            echo '<a href="'.esc_url($edit_url).'" class="button">Modifier</a></td>';
            echo '</tr>';
        }
    }
    echo '</tbody></table></div>';
    ?>
    <script>
    document.addEventListener('DOMContentLoaded',function(){
        function toggleCustom(select){
            var custom = select.parentNode.querySelector('.category-custom');
            if(!custom) return;
            if(select.value === '__other'){
                custom.style.display='';
            }else{
                custom.style.display='none';
            }
        }
        document.querySelectorAll('.category-select').forEach(function(sel){
            toggleCustom(sel);
            sel.addEventListener('change', function(){ toggleCustom(sel); });
        });
    });
    </script>
    <?php
}
