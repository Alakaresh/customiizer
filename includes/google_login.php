<?php

function customiizer_base64url_decode($data) {
    $data = str_replace(['-', '_'], ['+', '/'], $data);
    $padding = 4 - (strlen($data) % 4);
    if ($padding < 4) {
        $data .= str_repeat('=', $padding);
    }
    return base64_decode($data);
}

function customiizer_verify_google_id_token($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }

    list($header64, $payload64, $sig64) = $parts;
    $header = json_decode(customiizer_base64url_decode($header64), true);
    $payload = json_decode(customiizer_base64url_decode($payload64), true);
    if (!$header || !$payload || empty($header['kid'])) {
        return false;
    }

    $certs = get_transient('customiizer_google_certs');
    if (!$certs) {
        $response = wp_remote_get('https://www.googleapis.com/oauth2/v3/certs', ['timeout' => 15]);
        if (is_wp_error($response)) {
            return false;
        }
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (empty($body['keys'])) {
            return false;
        }
        $certs = $body['keys'];
        set_transient('customiizer_google_certs', $certs, DAY_IN_SECONDS);
    }

    foreach ($certs as $cert) {
        if ($cert['kid'] === $header['kid'] && !empty($cert['x5c'][0])) {
            $pem = "-----BEGIN CERTIFICATE-----\n" . trim($cert['x5c'][0]) . "\n-----END CERTIFICATE-----";
            $public_key = openssl_pkey_get_public($pem);
            if (!$public_key) {
                continue;
            }
            $signature = customiizer_base64url_decode($sig64);
            $verified = openssl_verify("$header64.$payload64", $signature, $public_key, OPENSSL_ALGO_SHA256);
            if ($verified === 1) {
                return $payload;
            }
        }
    }
    return false;
}

function customiizer_google_login(){
    if (empty($_POST['id_token'])) {
        wp_send_json_error(['message' => 'Missing ID token']);
    }

    $payload = customiizer_verify_google_id_token($_POST['id_token']);
    if (!$payload) {
        wp_send_json_error(['message' => 'Google verification failed']);
    }

    if (empty($payload['email']) || $payload['aud'] !== GOOGLE_CLIENT_ID) {
        wp_send_json_error(['message' => 'Invalid token']);
    }

    $email = sanitize_email($payload['email']);
    $name  = isset($payload['name']) ? sanitize_text_field($payload['name']) : '';
    $user = get_user_by('email', $email);
    if(!$user){
        $username_base = isset($payload['given_name']) ? sanitize_user($payload['given_name'], true) : 'googleuser';

        $username = $username_base . '_' . wp_generate_password(4, false);
        $password = wp_generate_password();
        $user_id = wp_create_user($username, $password, $email);
        if(is_wp_error($user_id)){
            wp_send_json_error(['message'=>'User creation failed']);
        }
        if($name){
            wp_update_user(['ID'=>$user_id,'display_name'=>$name]);
        }
        global $wpdb;
        $wpdb->insert('WPC_users',['user_id'=>$user_id,'image_credits'=>30],['%d','%d']);
        $user = get_user_by('ID', $user_id);
    }
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID);
    wp_send_json_success(['message'=>'Login successful']);
}
add_action('wp_ajax_nopriv_google_login','customiizer_google_login');
add_action('wp_ajax_google_login','customiizer_google_login');

