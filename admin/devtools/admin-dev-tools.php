<?php
// Admin submenu to toggle dev position editor
add_action('admin_menu', function () {
    add_submenu_page(
        'options-general.php',
        'Customiizer Dev Tools',
        'Customiizer Dev Tools',
        'manage_options',
        'customiizer-dev-tools',
        'customiizer_render_dev_tools_page'
    );
});

function customiizer_render_dev_tools_page() {
    if (!empty($_POST['customiizer_dev_editor_nonce']) &&
        check_admin_referer('customiizer_dev_editor_action', 'customiizer_dev_editor_nonce')) {
        update_option('customiizer_dev_editor', isset($_POST['customiizer_dev_editor']) ? '1' : '0');
        echo '<div class="updated"><p>Réglages enregistrés.</p></div>';
    }

    $checked = get_option('customiizer_dev_editor') ? 'checked' : '';
    echo '<div class="wrap">';
    echo '<h1>Customiizer Dev Tools</h1>';
    echo '<form method="post">';
    wp_nonce_field('customiizer_dev_editor_action', 'customiizer_dev_editor_nonce');
    echo '<label><input type="checkbox" name="customiizer_dev_editor" value="1" ' . $checked . '> Activer l\'éditeur de position</label>';
    submit_button();
    echo '<p>Activez cette option pour pouvoir ajuster la position du mockup sur les pages produit. Décochez pour désactiver l\'outil.</p>';
    echo '</form>';
    echo '</div>';
}

