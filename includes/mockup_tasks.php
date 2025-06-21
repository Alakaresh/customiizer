<?php
function customiizer_store_mockup_file($task_id, $file_path) {
    $pending = get_option('customiizer_pending_mockups', []);
    $pending[$task_id] = $file_path;
    update_option('customiizer_pending_mockups', $pending);
}

function customiizer_delete_mockup_file($task_id, $logger = null) {
    $pending = get_option('customiizer_pending_mockups', []);
    if (!isset($pending[$task_id])) {
        return false;
    }
    $file = $pending[$task_id];
    if (file_exists($file)) {
        if (unlink($file)) {
            if ($logger) {
                $logger->log("🗑️ Fichier temporaire supprimé : $file");
            } else {
                customiizer_log("🗑️ Fichier temporaire supprimé : $file");
            }
        } else {
            if ($logger) {
                $logger->log("⚠️ Erreur lors de la suppression du fichier temporaire $file");
            } else {
                customiizer_log("⚠️ Erreur lors de la suppression du fichier temporaire $file");
            }
        }
    }
    unset($pending[$task_id]);
    update_option('customiizer_pending_mockups', $pending);
    return true;
}
