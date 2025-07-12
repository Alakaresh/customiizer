<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Missions management functions.
 */

function customiizer_assign_mission( $user_id, $mission_id ) {
    global $wpdb;
    $user_id   = intval( $user_id );
    $mission_id = intval( $mission_id );
    if ( $user_id <= 0 || $mission_id <= 0 ) {
        return false;
    }
    $wpdb->query( $wpdb->prepare(
        "INSERT IGNORE INTO WPC_user_missions (user_id, mission_id) VALUES (%d,%d)",
        $user_id,
        $mission_id
    ) );
    return true;
}

function customiizer_get_missions( $user_id = 0 ) {
    global $wpdb;
    $user_id = $user_id ? intval( $user_id ) : get_current_user_id();
    if ( $user_id <= 0 ) {
        return array();
    }
    $sql = $wpdb->prepare(
        "SELECT m.mission_id, m.title, m.description, m.goal, m.points_reward, m.category,
                IFNULL(um.progress, 0) AS progress, um.completed_at
         FROM WPC_missions m
         LEFT JOIN WPC_user_missions um ON m.mission_id = um.mission_id AND um.user_id = %d
         WHERE m.is_active = 1",
        $user_id
    );
    return $wpdb->get_results( $sql, ARRAY_A );
}

function customiizer_update_mission_progress( $user_id, $mission_id, $quantity = 1 ) {
    global $wpdb;
    $user_id    = intval( $user_id );
    $mission_id = intval( $mission_id );
    $quantity   = intval( $quantity );
    if ( $user_id <= 0 || $mission_id <= 0 || $quantity <= 0 ) {
        return false;
    }
    $wpdb->query( $wpdb->prepare(
        "INSERT INTO WPC_user_missions (user_id, mission_id, progress)
         VALUES (%d, %d, %d)
         ON DUPLICATE KEY UPDATE progress = progress + VALUES(progress)",
        $user_id,
        $mission_id,
        $quantity
    ) );
    $current = $wpdb->get_row( $wpdb->prepare(
        "SELECT progress, completed_at FROM WPC_user_missions WHERE user_id=%d AND mission_id=%d",
        $user_id,
        $mission_id
    ), ARRAY_A );
    if ( $current && empty( $current['completed_at'] ) ) {
        $goal = intval( $wpdb->get_var( $wpdb->prepare( "SELECT goal FROM WPC_missions WHERE mission_id=%d", $mission_id ) ) );
        if ( $current['progress'] >= $goal ) {
            customiizer_complete_mission( $user_id, $mission_id );
        }
    }
    return true;
}

function customiizer_complete_mission( $user_id, $mission_id ) {
    global $wpdb;
    $user_id    = intval( $user_id );
    $mission_id = intval( $mission_id );
    if ( $user_id <= 0 || $mission_id <= 0 ) {
        return false;
    }
    $wpdb->query( $wpdb->prepare(
        "UPDATE WPC_user_missions SET completed_at = NOW(), progress = goal WHERE user_id=%d AND mission_id=%d AND completed_at IS NULL",
        $user_id,
        $mission_id
    ) );
    customiizer_reward_mission( $user_id, $mission_id );
    return true;
}

function customiizer_reward_mission( $user_id, $mission_id ) {
    global $wpdb;
    $user_id    = intval( $user_id );
    $mission_id = intval( $mission_id );
    if ( $user_id <= 0 || $mission_id <= 0 ) {
        return;
    }
    $mission = $wpdb->get_row( $wpdb->prepare( "SELECT title, points_reward, category FROM WPC_missions WHERE mission_id=%d", $mission_id ), ARRAY_A );
    if ( ! $mission ) {
        return;
    }
    customiizer_add_loyalty_points( $user_id, intval( $mission['points_reward'] ), 'mission', $mission['title'] );
}

function customiizer_get_missions_ajax() {
    if ( ! is_user_logged_in() ) {
        wp_send_json_error( 'not_logged_in' );
    }
    $missions = customiizer_get_missions( get_current_user_id() );
    wp_send_json_success( $missions );
}
add_action( 'wp_ajax_customiizer_get_missions', 'customiizer_get_missions_ajax' );

function customiizer_update_mission_progress_ajax() {
    if ( ! is_user_logged_in() ) {
        wp_send_json_error( 'not_logged_in' );
    }
    $mission_id = intval( $_POST['mission_id'] ?? 0 );
    $qty        = intval( $_POST['quantity'] ?? 1 );
    customiizer_update_mission_progress( get_current_user_id(), $mission_id, $qty );
    wp_send_json_success();
}
add_action( 'wp_ajax_customiizer_update_mission_progress', 'customiizer_update_mission_progress_ajax' );
