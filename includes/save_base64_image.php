<?php
function save_image_from_base64() {
    if (!isset($_POST['image_base64'])) {
        wp_send_json_error(['message' => 'Paramètre image_base64 manquant.'], 400);
    }

    $data = $_POST['image_base64'];
    $filename = isset($_POST['filename']) ? sanitize_file_name($_POST['filename']) : uniqid('img_') . '.png';

    $data = preg_replace('#^data:image/\w+;base64,#i', '', $data);
    $decoded = base64_decode($data);
    if ($decoded === false) {
        wp_send_json_error(['message' => 'Données base64 invalides.'], 400);
    }

    $upload_dir = wp_upload_dir();
    $file_path = trailingslashit($upload_dir['path']) . $filename;
    if (file_put_contents($file_path, $decoded) === false) {
        wp_send_json_error(['message' => 'Erreur lors de la sauvegarde du fichier.'], 500);
    }

    customiizer_log("📥 Fichier temporaire sauvegardé : $file_path");

    $url = trailingslashit($upload_dir['url']) . $filename;
    customiizer_log("✅ URL publique générée : $url");
    wp_send_json_success(['image_url' => $url]);
}
add_action('wp_ajax_save_image_from_base64', 'save_image_from_base64');
add_action('wp_ajax_nopriv_save_image_from_base64', 'save_image_from_base64');
