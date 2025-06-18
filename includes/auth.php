<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function customiizer_api_permissions( WP_REST_Request $request ) {
    $token = $request->get_header('X-Customiizer-Token');

    // Autoriser si le token est présent et valide
    if ($token && defined('CUSTOMIIZER_API_TOKEN') && hash_equals(CUSTOMIIZER_API_TOKEN, $token)) {
        return true;
    }

    // Autoriser si la requête vient du même site (navigateur)
    $referer = $request->get_header('referer');
    $origin = $request->get_header('origin');
    $site_url = get_site_url();

    if (
        ($referer && strpos($referer, $site_url) === 0) ||
        ($origin && strpos($origin, $site_url) === 0)
    ) {
        return true;
    }

    // Sinon, bloqué
    return false;
}
