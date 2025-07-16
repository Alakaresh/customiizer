<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function customiizer_add_image_credits( $user_id, $amount ) {
    global $wpdb;
    $user_id = intval( $user_id );
    $amount  = intval( $amount );
    if ( $user_id <= 0 || $amount <= 0 ) {
        return false;
    }
    $wpdb->query( $wpdb->prepare(
        "UPDATE WPC_users SET image_credits = image_credits + %d WHERE user_id = %d",
        $amount,
        $user_id
    ) );
    return true;
}
