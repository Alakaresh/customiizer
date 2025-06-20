<?php
if (isset($_POST['save_mobile_block']) && check_admin_referer('mobile_block_action', 'mobile_block_nonce')) {
    $enabled = isset($_POST['mobile_block']) ? 1 : 0;
    update_option('customiizer_mobile_block', $enabled);
    echo '<div class="notice notice-success"><p>Réglage sauvegardé.</p></div>';
}

$enabled = get_option('customiizer_mobile_block', 0);
?>
<hr style="margin-top:30px;margin-bottom:30px;">
<h3>📱 Blocage Mobile</h3>
<form method="post" style="margin-bottom:20px;">
    <?php wp_nonce_field('mobile_block_action', 'mobile_block_nonce'); ?>
    <label>
        <input type="checkbox" name="mobile_block" <?php checked($enabled, 1); ?> />
        Activer le blocage sur smartphone
    </label>
    <button type="submit" name="save_mobile_block" class="button button-primary">Enregistrer</button>
</form>

