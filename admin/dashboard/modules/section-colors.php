<?php
echo '<h2>🎨 Palette de couleurs</h2>';

// Définition des champs et valeurs par défaut
$fields = [
    'bg'               => 'Surfaces - Arrière-plan',
    'primary'          => 'Surfaces - Primaire',
    'secondary'        => 'Surfaces - Secondaire',
    'text'             => 'Texte',
    'text_muted'       => 'Texte atténué',
    'text_inverse'     => 'Texte inversé',
    'header_primary'   => 'Header/Footer - Primaire',
    'header_secondary' => 'Header/Footer - Secondaire',
    'action_primary'   => 'Actions - Primaire',
    'action_secondary' => 'Actions - Secondaire',
    'action_accent'    => 'Actions - Accent',
    'on_primary'       => 'Contraste actions - Sur primaire',
    'on_secondary'     => 'Contraste actions - Sur secondaire',
    'on_accent'        => 'Contraste actions - Sur accent',
    'ui_border'        => 'UI - Bordure',
    'ui_focus'         => 'UI - Focus',
    'feedback_success' => 'Feedback - Succès',
    'feedback_warning' => 'Feedback - Avertissement',
    'feedback_danger'  => 'Feedback - Danger',
];

$defaults = [
    'bg'               => '#242424',
    'primary'          => '#5a90a0',
    'secondary'        => '#007bff',
    'text'             => '#ffffff',
    'text_muted'       => '#6c757d',
    'text_inverse'     => '#000000',
    'header_primary'   => '#5a90a0',
    'header_secondary' => '#007bff',
    'action_primary'   => '#007bff',
    'action_secondary' => '#6c757d',
    'action_accent'    => '#ffc107',
    'on_primary'       => '#ffffff',
    'on_secondary'     => '#ffffff',
    'on_accent'        => '#000000',
    'ui_border'        => '#ced4da',
    'ui_focus'         => '#80bdff',
    'feedback_success' => '#28a745',
    'feedback_warning' => '#ffc107',
    'feedback_danger'  => '#dc3545',
];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['customiizer_colors_nonce']) && wp_verify_nonce($_POST['customiizer_colors_nonce'], 'customiizer_save_colors')) {
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

$colors = [];
foreach ($defaults as $field => $default) {
    if ($field === 'bg') {
        $colors[$field] = get_option('customiizer_color_bg', get_option('customiizer_color_background', $default));
    } else {
        $colors[$field] = get_option('customiizer_color_' . $field, $default);
    }
}
?>

<form method="post">
    <?php wp_nonce_field('customiizer_save_colors', 'customiizer_colors_nonce'); ?>
    <table class="form-table">
        <?php foreach ($fields as $field => $label): ?>
        <tr>
            <th scope="row"><label for="<?php echo esc_attr($field); ?>"><?php echo esc_html($label); ?></label></th>
            <td>
                <input type="color" id="<?php echo esc_attr($field); ?>" name="<?php echo esc_attr($field); ?>" value="<?php echo esc_attr($colors[$field]); ?>">
                <input type="text" id="<?php echo esc_attr($field); ?>-hex" class="customiizer-color-hex" value="<?php echo esc_attr($colors[$field]); ?>" maxlength="7" pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$">
            </td>
        </tr>
        <?php endforeach; ?>
    </table>
    <?php submit_button('Enregistrer la palette'); ?>
</form>

<hr style="margin-top:30px;margin-bottom:30px;">

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

