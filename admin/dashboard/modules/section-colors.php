<?php
echo '<h2>🎨 Palette de couleurs</h2>';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['customiizer_colors_nonce']) && wp_verify_nonce($_POST['customiizer_colors_nonce'], 'customiizer_save_colors')) {
    $fields = ['primary', 'secondary', 'background', 'text'];
    foreach ($fields as $field) {
        if (isset($_POST[$field])) {
            $color = sanitize_hex_color($_POST[$field]);
            if ($color) {
                update_option('customiizer_color_' . $field, $color);
            }
        }
    }
    echo '<div class="notice notice-success"><p>Palette mise à jour.</p></div>';
}

$colors = [
    'primary' => get_option('customiizer_color_primary', '#5a90a0'),
    'secondary' => get_option('customiizer_color_secondary', '#007bff'),
    'background' => get_option('customiizer_color_background', '#242424'),
    'text' => get_option('customiizer_color_text', '#ffffff'),
];
?>

<form method="post">
    <?php wp_nonce_field('customiizer_save_colors', 'customiizer_colors_nonce'); ?>
    <table class="form-table">
        <tr>
            <th scope="row"><label for="primary">Couleur primaire</label></th>
            <td><input type="color" id="primary" name="primary" value="<?php echo esc_attr($colors['primary']); ?>"></td>
        </tr>
        <tr>
            <th scope="row"><label for="secondary">Couleur secondaire</label></th>
            <td><input type="color" id="secondary" name="secondary" value="<?php echo esc_attr($colors['secondary']); ?>"></td>
        </tr>
        <tr>
            <th scope="row"><label for="background">Arrière-plan</label></th>
            <td><input type="color" id="background" name="background" value="<?php echo esc_attr($colors['background']); ?>"></td>
        </tr>
        <tr>
            <th scope="row"><label for="text">Texte</label></th>
            <td><input type="color" id="text" name="text" value="<?php echo esc_attr($colors['text']); ?>"></td>
        </tr>
    </table>
    <?php submit_button('Enregistrer la palette'); ?>
</form>

<hr style="margin-top:30px;margin-bottom:30px;">

