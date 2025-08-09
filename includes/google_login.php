<?php

function customiizer_base64url_decode($data) {
    $data = str_replace(['-', '_'], ['+', '/'], $data);
    $padding = 4 - (strlen($data) % 4);
    if ($padding < 4) {
        $data .= str_repeat('=', $padding);
    }
    return base64_decode($data);
}

/**
 * Télécharge les certificats Google (JWKS) et les met en cache selon max-age.
 */
function customiizer_fetch_google_certs() {
    $resp = wp_remote_get('https://www.googleapis.com/oauth2/v3/certs', ['timeout' => 15]);
    if (is_wp_error($resp) || wp_remote_retrieve_response_code($resp) !== 200) {
        return [];
    }
    $body = json_decode(wp_remote_retrieve_body($resp), true);
    $keys = $body['keys'] ?? [];

    // TTL par défaut 1h si pas de max-age dans Cache-Control
    $ttl = HOUR_IN_SECONDS;
    $cc  = wp_remote_retrieve_header($resp, 'cache-control');
    if (is_string($cc) && preg_match('/max-age=(\d+)/', $cc, $m)) {
        $ttl = (int) $m[1];
    }
    set_transient('customiizer_google_certs', $keys, $ttl);
    return $keys;
}

/**
 * Tente de vérifier la signature du token avec la liste de certs fournie.
 * Retourne le payload décodé si OK, sinon false.
 */
function customiizer_try_verify($header64, $payload64, $sig64, $kid, $certs) {
    $payload = json_decode(customiizer_base64url_decode($payload64), true);
    foreach ($certs as $cert) {
        if (!empty($kid) && isset($cert['kid']) && $cert['kid'] !== $kid) {
            continue;
        }
        if (empty($cert['x5c'][0])) continue;

        $pem = "-----BEGIN CERTIFICATE-----\n" . trim($cert['x5c'][0]) . "\n-----END CERTIFICATE-----";
        $public_key = openssl_pkey_get_public($pem);
        if (!$public_key) continue;

        $signature = customiizer_base64url_decode($sig64);
        $ok = openssl_verify("$header64.$payload64", $signature, $public_key, OPENSSL_ALGO_SHA256);
        if ($ok === 1) {
            return $payload;
        }
    }
    return false;
}

/**
 * Vérifie un ID token Google (GIS) en local avec les JWKS.
 * Retourne le payload si OK, sinon false.
 * (Le check de l'audience est fait dans customiizer_google_login().)
 */
function customiizer_verify_google_id_token($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }

    list($header64, $payload64, $sig64) = $parts;
    $header  = json_decode(customiizer_base64url_decode($header64), true);
    if (!$header || empty($header['kid'])) {
        return false;
    }
    $kid = $header['kid'];

    // 1) Essaye avec le cache courant (sinon fetch)
    $certs = get_transient('customiizer_google_certs');
    if (!$certs) {
        $certs = customiizer_fetch_google_certs();
    }

    $payload = customiizer_try_verify($header64, $payload64, $sig64, $kid, $certs);

    // 2) Si échec, force un re-fetch (rotation probable) et retente une fois
    if (!$payload) {
        delete_transient('customiizer_google_certs');
        $certs = customiizer_fetch_google_certs();
        $payload = customiizer_try_verify($header64, $payload64, $sig64, $kid, $certs);
    }

    if (!$payload) {
        return false;
    }

    // 3) Vérifs minimales de claims
    $iss = $payload['iss'] ?? '';
    if ($iss !== 'https://accounts.google.com' && $iss !== 'accounts.google.com') {
        return false;
    }

    $now = time();
    // tolérance 60s sur l'horloge
    if (($payload['exp'] ?? 0) < ($now - 60)) return false;
    if (($payload['nbf'] ?? 0) > ($now + 60)) return false;

    return $payload;
}

function customiizer_google_login(){
    if (empty($_POST['id_token'])) {
        wp_send_json_error(['message' => 'Missing ID token']);
    }

    $payload = customiizer_verify_google_id_token($_POST['id_token']);
    if (!$payload) {
        // error_log('Google verify failed (possible JWKS rotation)'); // décommente pour debug
        wp_send_json_error(['message' => 'Google verification failed']);
    }

    // Vérif d'audience contre ta constante (tu l'as déjà bien renseignée)
    if (empty($payload['email']) || $payload['aud'] !== GOOGLE_CLIENT_ID) {
        wp_send_json_error(['message' => 'Invalid token']);
    }

    $email = sanitize_email($payload['email']);
    $name  = isset($payload['name']) ? sanitize_text_field($payload['name']) : '';
    $user = get_user_by('email', $email);
    if (!$user) {
        $username_base = isset($payload['given_name']) ? sanitize_user($payload['given_name'], true) : 'googleuser';
        $username = $username_base . '_' . wp_generate_password(4, false);
        $password = wp_generate_password();
        $user_id = wp_create_user($username, $password, $email);
        if (is_wp_error($user_id)) {
            wp_send_json_error(['message' => 'User creation failed']);
        }
        if ($name) {
            wp_update_user(['ID' => $user_id, 'display_name' => $name]);
        }
        global $wpdb;
        $wpdb->insert('WPC_users', ['user_id' => $user_id, 'image_credits' => 30], ['%d','%d']);
        $user = get_user_by('ID', $user_id);
    }

    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID);
    wp_send_json_success(['message' => 'Login successful']);
}

add_action('wp_ajax_nopriv_google_login','customiizer_google_login');
add_action('wp_ajax_google_login','customiizer_google_login');
