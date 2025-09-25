<?php
if (!defined('ABSPATH')) {
    exit;
}

const CUSTOMIIZER_ACTIVE_GENERATION_META = 'customiizer_active_generation';

function customiizer_require_logged_in_user() {
    if (!is_user_logged_in()) {
        wp_send_json_error(['message' => 'Authentification requise'], 401);
    }
    return get_current_user_id();
}

function customiizer_sanitise_generation_snapshot($snapshot, $user_id) {
    if (!is_array($snapshot)) {
        return null;
    }

    $hash = isset($snapshot['hash']) ? sanitize_text_field($snapshot['hash']) : '';
    if (empty($hash)) {
        return null;
    }

    $stage = isset($snapshot['stage']) ? sanitize_text_field($snapshot['stage']) : 'generation';
    $status = isset($snapshot['status']) ? sanitize_text_field($snapshot['status']) : 'running';

    $ratio = isset($snapshot['ratio']) ? sanitize_text_field($snapshot['ratio']) : '';
    $display_name = isset($snapshot['displayName']) ? sanitize_text_field($snapshot['displayName']) : '';
    $user_logo = isset($snapshot['userLogo']) ? esc_url_raw($snapshot['userLogo']) : '';
    $prompt = isset($snapshot['prompt']) ? sanitize_textarea_field($snapshot['prompt']) : '';
    $settings = isset($snapshot['settings']) ? sanitize_textarea_field($snapshot['settings']) : '';
    $displayed_url = isset($snapshot['displayedUrl']) ? esc_url_raw($snapshot['displayedUrl']) : '';
    $raw_url = isset($snapshot['rawUrl']) ? esc_url_raw($snapshot['rawUrl']) : '';

    $progress = isset($snapshot['progress']) ? floatval($snapshot['progress']) : 0;
    $started_at = isset($snapshot['startedAt']) ? intval($snapshot['startedAt']) : 0;
    $updated_at = isset($snapshot['updatedAt']) ? intval($snapshot['updatedAt']) : 0;

    $upscale_hashes = [];
    if (!empty($snapshot['upscaleHashes']) && is_array($snapshot['upscaleHashes'])) {
        foreach ($snapshot['upscaleHashes'] as $choice => $hash_value) {
            $choice_key = sanitize_key($choice);
            $value = sanitize_text_field($hash_value);
            if (!empty($choice_key) && !empty($value)) {
                $upscale_hashes[$choice_key] = $value;
            }
        }
    }

    return [
        'hash' => $hash,
        'stage' => $stage,
        'status' => $status,
        'ratio' => $ratio,
        'prompt' => $prompt,
        'settings' => $settings,
        'displayName' => $display_name,
        'userLogo' => $user_logo,
        'userId' => intval($user_id),
        'progress' => $progress,
        'startedAt' => $started_at,
        'updatedAt' => $updated_at > 0 ? $updated_at : round(microtime(true) * 1000),
        'displayedUrl' => $displayed_url,
        'rawUrl' => $raw_url,
        'upscaleHashes' => $upscale_hashes,
    ];
}

function customiizer_set_active_generation() {
    $user_id = customiizer_require_logged_in_user();

    $payload = isset($_POST['payload']) ? wp_unslash($_POST['payload']) : '';
    if (empty($payload)) {
        wp_send_json_error(['message' => 'Payload manquant']);
    }

    $decoded = json_decode($payload, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        wp_send_json_error(['message' => 'Payload invalide']);
    }

    $sanitised = customiizer_sanitise_generation_snapshot($decoded, $user_id);
    if (!$sanitised) {
        wp_send_json_error(['message' => 'Instantané invalide']);
    }

    update_user_meta($user_id, CUSTOMIIZER_ACTIVE_GENERATION_META, $sanitised);

    wp_send_json_success(['stored' => true]);
}
add_action('wp_ajax_customiizer_set_active_generation', 'customiizer_set_active_generation');

function customiizer_get_active_generation() {
    $user_id = customiizer_require_logged_in_user();

    $stored = get_user_meta($user_id, CUSTOMIIZER_ACTIVE_GENERATION_META, true);

    if (empty($stored) || !is_array($stored) || empty($stored['hash'])) {
        delete_user_meta($user_id, CUSTOMIIZER_ACTIVE_GENERATION_META);
        wp_send_json_success(['job' => null]);
    }

    $stored['userId'] = intval($user_id);
    $stored['progress'] = isset($stored['progress']) ? floatval($stored['progress']) : 0;

    wp_send_json_success(['job' => $stored]);
}
add_action('wp_ajax_customiizer_get_active_generation', 'customiizer_get_active_generation');

function customiizer_clear_active_generation() {
    $user_id = customiizer_require_logged_in_user();
    delete_user_meta($user_id, CUSTOMIIZER_ACTIVE_GENERATION_META);
    wp_send_json_success(['cleared' => true]);
}
add_action('wp_ajax_customiizer_clear_active_generation', 'customiizer_clear_active_generation');
