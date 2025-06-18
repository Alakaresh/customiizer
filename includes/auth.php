<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function customiizer_api_permissions( WP_REST_Request $request ) {
    $token = $request->get_header( 'X-Customiizer-Token' );

    if ( $token && defined( 'CUSTOMIIZER_API_TOKEN' ) && hash_equals( CUSTOMIIZER_API_TOKEN, $token ) ) {
        return true;
    }

    return current_user_can( 'read' );
}

