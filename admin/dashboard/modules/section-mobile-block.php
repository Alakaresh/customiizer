<?php
// Mobile access control section
$enabled = get_option('customiizer_mobile_block', 1);

if (isset($_POST['save_mobile_block']) && check_admin_referer('toggle_mobile_block')) {
    $enabled = isset($_POST['mobile_block']) ? 1 : 0;
    update_option('customiizer_mobile_block', $enabled);
    echo '<div class="notice notice-success"><p>Réglages enregistrés.</p></div>';
}

echo '<h2>📱 Accès mobile</h2>';
?>
<form method="post">
    <?php wp_nonce_field('toggle_mobile_block'); ?>
    <label>
        <input type="checkbox" name="mobile_block" <?php checked($enabled, 1); ?> />
        Bloquer l\'accès depuis les smartphones
    </label>
    <p>
        <button type="submit" name="save_mobile_block" class="button button-primary">Enregistrer</button>
    </p>
</form>
<hr style="margin-top:30px;margin-bottom:30px;">
