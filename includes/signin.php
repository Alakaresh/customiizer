<?php
function user_signin() {
    // Vérifier le nonce
    if ( ! isset($_POST['registration_nonce']) ) {
        wp_send_json_error(['message' => 'Nonce is not set.']);
    }

    $nonce = $_POST['registration_nonce'];
    if ( ! wp_verify_nonce($nonce, 'signin_nonce') ) {
        wp_send_json_error(['message' => 'Nonce verification failed.']);
    }

    // Auth
    $info = [
        'user_login'    => sanitize_email($_POST['email'] ?? ''),
        'user_password' => $_POST['password'] ?? '',
        'remember'      => !empty($_POST['remember']) && $_POST['remember'] === '1',
    ];

    $user_signon = wp_signon($info, false);

    if ( is_wp_error($user_signon) ) {
        // ❌ Mauvais identifiants
        wp_send_json_error(['message' => 'Wrong email or password.']);
    }

    // ✅ Succès : établir proprement la session WP + WooCommerce
    wp_set_current_user($user_signon->ID);
    if ( function_exists('wc_set_customer_auth_cookie') ) {
        wc_set_customer_auth_cookie($user_signon->ID);
    } else {
        // fallback WP (selon version)
        wp_set_auth_cookie($user_signon->ID, $info['remember']);
    }

    if ( function_exists('WC') && WC()->session ) {
        WC()->session->set_customer_session_cookie(true);
    }

    // Optionnel: tu peux renvoyer une URL pour forcer un reload clean du checkout
    wp_send_json_success([
        'message'  => 'Login successful.',
        'redirect' => wc_get_checkout_url(),
    ]);
}
add_action('wp_ajax_nopriv_user_signin', 'user_signin');
// (facultatif) si jamais tu appelles l’action côté connecté aussi :
add_action('wp_ajax_user_signin', 'user_signin');
