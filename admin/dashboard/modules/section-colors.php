<?php
echo '<h2>🎨 Palette de couleurs</h2>';

// Définition des champs regroupés par catégories
$categories = [
    'Surfaces' => [
        'bg'       => 'Arrière-plan',
        'primary'  => 'Primaire',
        'secondary'=> 'Secondaire',
    ],
    'Texte' => [
        'text'       => 'Texte',
        'text_muted' => 'Texte atténué',
        'text_inverse'=> 'Texte inversé',
    ],
    'Header/Footer' => [
        'header_primary'   => 'Primaire',
        'header_secondary' => 'Secondaire',
    ],
    'Actions' => [
        'action_primary'   => 'Primaire',
        'action_secondary' => 'Secondaire',
        'action_accent'    => 'Accent',
        'on_primary'       => 'Contraste - Sur primaire',
        'on_secondary'     => 'Contraste - Sur secondaire',
        'on_accent'        => 'Contraste - Sur accent',
    ],
    'UI' => [
        'ui_border' => 'Bordure',
        'ui_focus'  => 'Focus',
    ],
    'Feedback' => [
        'feedback_success' => 'Succès',
        'feedback_warning' => 'Avertissement',
        'feedback_danger'  => 'Danger',
    ],
];

// Liste à plat des champs pour le traitement des formulaires
$fields = [];
foreach ($categories as $group) {
    foreach ($group as $field => $label) {
        $fields[$field] = $label;
    }
}

$defaults = [
    'bg'               => '#101413',
    'primary'          => '#2f8f63',
    'secondary'        => '#1a563d',
    'text'             => '#f6f7f7',
    'text_muted'       => '#8c9390',
    'text_inverse'     => '#151716',
    'header_primary'   => '#161d1b',
    'header_secondary' => '#2f8f63',
    'action_primary'   => '#2f8f63',
    'action_secondary' => '#1a563d',
    'action_accent'    => '#c9ebdc',
    'on_primary'       => '#f6f7f7',
    'on_secondary'     => '#f6f7f7',
    'on_accent'        => '#151716',
    'ui_border'        => '#3c403e',
    'ui_focus'         => '#3d9f74',
    'feedback_success' => '#30c97a',
    'feedback_warning' => '#f7b046',
    'feedback_danger'  => '#ef5350',
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['customiizer_colors_nonce']) && wp_verify_nonce($_POST['customiizer_colors_nonce'], 'customiizer_save_colors')) {
        foreach (array_keys($fields) as $field) {
            if (isset($_POST[$field])) {
                $color = sanitize_hex_color($_POST[$field]);
                if ($color) {
                    update_option('customiizer_color_' . $field, $color);
                    if ($field === 'bg') {
                        update_option('customiizer_color_background', $color);
                    }
                }
            }
        }
        echo '<div class="notice notice-success"><p>Palette mise à jour.</p></div>';
    }

    if (isset($_POST['customiizer_palette_nonce']) && wp_verify_nonce($_POST['customiizer_palette_nonce'], 'customiizer_palette_action')) {
        $templates = get_option('customiizer_color_templates', []);
        $name = sanitize_text_field($_POST['template_name'] ?? '');
        $action = $_POST['palette_action'] ?? '';

        if ($action === 'save' && $name !== '') {
            $palette = [];
            foreach ($defaults as $field => $default) {
                if ($field === 'bg') {
                    $palette[$field] = get_option('customiizer_color_bg', get_option('customiizer_color_background', $default));
                } else {
                    $palette[$field] = get_option('customiizer_color_' . $field, $default);
                }
            }
            $templates[$name] = $palette;
            update_option('customiizer_color_templates', $templates);
            echo '<div class="notice notice-success"><p>Modèle enregistré.</p></div>';
        } elseif ($action === 'load' && $name !== '' && isset($templates[$name])) {
            foreach ($templates[$name] as $field => $color) {
                update_option('customiizer_color_' . $field, $color);
                if ($field === 'bg') {
                    update_option('customiizer_color_background', $color);
                }
            }
            echo '<div class="notice notice-success"><p>Modèle chargé.</p></div>';
        } elseif ($action === 'delete' && $name !== '' && isset($templates[$name])) {
            unset($templates[$name]);
            update_option('customiizer_color_templates', $templates);
            echo '<div class="notice notice-success"><p>Modèle supprimé.</p></div>';
        }
    }
}

$colors = [];
foreach ($defaults as $field => $default) {
    if ($field === 'bg') {
        $colors[$field] = get_option('customiizer_color_bg', get_option('customiizer_color_background', $default));
    } else {
        $colors[$field] = get_option('customiizer_color_' . $field, $default);
    }
}

$templates = get_option('customiizer_color_templates', []);
?>

<form method="post">
    <?php wp_nonce_field('customiizer_save_colors', 'customiizer_colors_nonce'); ?>
    <table class="form-table">
        <?php foreach ($categories as $category => $fields_group): ?>
            <tr class="customiizer-category-heading">
                <th colspan="2"><h3><?php echo esc_html($category); ?></h3></th>
            </tr>
            <?php foreach ($fields_group as $field => $label): ?>
                <tr>
                    <th scope="row"><label for="<?php echo esc_attr($field); ?>"><?php echo esc_html($label); ?></label></th>
                    <td>
                        <input type="color" id="<?php echo esc_attr($field); ?>" name="<?php echo esc_attr($field); ?>" value="<?php echo esc_attr($colors[$field]); ?>">
                        <input type="text" id="<?php echo esc_attr($field); ?>-hex" class="customiizer-color-hex" value="<?php echo esc_attr($colors[$field]); ?>" maxlength="7" pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$">
                    </td>
                </tr>
            <?php endforeach; ?>
        <?php endforeach; ?>
    </table>
    <?php submit_button('Enregistrer la palette'); ?>
</form>

<hr style="margin-top:30px;margin-bottom:30px;">

<h3>Modèles de palette</h3>
<form method="post" style="margin-bottom:20px;">
    <?php wp_nonce_field('customiizer_palette_action', 'customiizer_palette_nonce'); ?>
    <input type="hidden" name="palette_action" value="save">
    <input type="text" name="template_name" placeholder="Nom du modèle" required>
    <?php submit_button('Sauvegarder le modèle', 'secondary', 'submit', false); ?>
</form>

<?php if ($templates): ?>
    <ul>
        <?php foreach ($templates as $name => $palette): ?>
            <li>
                <strong><?php echo esc_html($name); ?></strong>
                <form method="post" style="display:inline;margin-left:10px;">
                    <?php wp_nonce_field('customiizer_palette_action', 'customiizer_palette_nonce'); ?>
                    <input type="hidden" name="template_name" value="<?php echo esc_attr($name); ?>">
                    <input type="hidden" name="palette_action" value="load">
                    <?php submit_button('Charger', 'secondary', 'submit', false); ?>
                </form>
                <form method="post" style="display:inline;margin-left:5px;">
                    <?php wp_nonce_field('customiizer_palette_action', 'customiizer_palette_nonce'); ?>
                    <input type="hidden" name="template_name" value="<?php echo esc_attr($name); ?>">
                    <input type="hidden" name="palette_action" value="delete">
                    <?php submit_button('Supprimer', 'link-delete', 'submit', false); ?>
                </form>
            </li>
        <?php endforeach; ?>
    </ul>
<?php else: ?>
    <p>Aucun modèle enregistré.</p>
<?php endif; ?>

<script>
document.querySelectorAll('.customiizer-color-hex').forEach(function(hexInput){
    var colorInput = document.getElementById(hexInput.id.replace('-hex',''));
    if(!colorInput){
        return;
    }
    colorInput.addEventListener('input', function(){
        hexInput.value = colorInput.value;
    });
    hexInput.addEventListener('input', function(){
        if(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hexInput.value)){
            colorInput.value = hexInput.value;
        }
    });
});
</script>
