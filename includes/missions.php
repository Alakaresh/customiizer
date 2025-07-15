<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Missions management functions.
 */

/**
 * Available mission trigger actions.
 *
 * @return array action => label
 */
function customiizer_get_mission_actions() {
    return array(
        'user_register'            => __( 'Création de compte', 'customiizer' ),
        'order_completed'          => __( 'Commande terminée', 'customiizer' ),
        'image_generated'          => __( 'Génération d\'image', 'customiizer' ),
    );
}

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

/**
 * Increment progress for all missions triggered by an action.
 *
 * The same quantity value is applied to every mission using this trigger,
 * including missions that may be created later.
 *
 * @param string $action   Action identifier.
 * @param int    $user_id  User ID the missions belong to.
 * @param int    $quantity Amount of progress to add (defaults to 1).
 */
function customiizer_process_mission_action( $action, $user_id, $quantity = 1 ) {
    global $wpdb;
    $action   = sanitize_key( $action );
    $user_id  = intval( $user_id );
    if ( ! $action || $user_id <= 0 ) {
        return;
    }

    // Make sure the totals table exists before updating it
    customiizer_ensure_action_totals_table();

    // Keep a running total for this user's action quantity
    $wpdb->query( $wpdb->prepare(
        "INSERT INTO WPC_user_action_totals (user_id, action, total)
         VALUES (%d, %s, %d)
         ON DUPLICATE KEY UPDATE total = total + VALUES(total)",
        $user_id,
        $action,
        intval( $quantity )
    ) );

    $mission_ids = $wpdb->get_col( $wpdb->prepare(
        "SELECT mission_id FROM WPC_missions WHERE trigger_action = %s AND is_active = 1",
        $action
    ) );

    $quantity = intval( $quantity );

    foreach ( $mission_ids as $mission_id ) {
        customiizer_update_mission_progress( $user_id, intval( $mission_id ), $quantity );
    }
}

/**
 * Ensure DB schema includes trigger_action column.
 */
function customiizer_ensure_mission_action_column() {
    global $wpdb;
    $table = 'WPC_missions';
    $col   = $wpdb->get_col( $wpdb->prepare( "SHOW COLUMNS FROM {$table} LIKE %s", 'trigger_action' ) );
    if ( empty( $col ) ) {
        $wpdb->query( "ALTER TABLE {$table} ADD trigger_action VARCHAR(64) DEFAULT ''" );
    }
}
add_action( 'after_setup_theme', 'customiizer_ensure_mission_action_column' );

/**
 * Ensure DB schema for action totals table.
 */
function customiizer_ensure_action_totals_table() {
    global $wpdb;
    $table  = 'WPC_user_action_totals';
    $exists = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) );
    if ( $exists !== $table ) {
        $wpdb->query( "CREATE TABLE {$table} (
            user_id BIGINT(20) UNSIGNED NOT NULL,
            action VARCHAR(64) NOT NULL DEFAULT '',
            total INT UNSIGNED NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, action)
        )" );
    }
}
add_action( 'after_setup_theme', 'customiizer_ensure_action_totals_table' );

function customiizer_get_missions( $user_id = 0 ) {
    global $wpdb;
    $user_id = $user_id ? intval( $user_id ) : get_current_user_id();
    if ( $user_id <= 0 ) {
        return array();
    }
    $tables = $wpdb->get_col( $wpdb->prepare( 'SHOW TABLES LIKE %s', 'WPC_user_action_totals' ) );

    $select_totals = '0 AS action_total';
    $join_totals   = '';
    $params        = [ $user_id ];

    if ( ! empty( $tables ) ) {
        $select_totals = 'ut.total AS action_total';
        $join_totals   = $wpdb->prepare(
            " LEFT JOIN WPC_user_action_totals ut ON ut.user_id = %d AND ut.action = m.trigger_action",
            $user_id
        );
    }

    $sql = $wpdb->prepare(
        "SELECT m.mission_id, m.title, m.description, m.goal, m.points_reward, m.category, m.trigger_action,
                um.progress AS user_progress, {$select_totals}, um.completed_at
         FROM WPC_missions m
         LEFT JOIN WPC_user_missions um ON m.mission_id = um.mission_id AND um.user_id = %d" .
         $join_totals .
         " WHERE m.is_active = 1",
        $params

    );
    $rows = $wpdb->get_results( $sql, ARRAY_A );

    foreach ( $rows as &$r ) {
        $progress = isset( $r['user_progress'] ) ? intval( $r['user_progress'] ) : 0;
        if ( 0 === $progress && isset( $r['action_total'] ) ) {
            $progress = intval( $r['action_total'] );
            if ( $progress > 0 ) {
                customiizer_update_mission_progress( $user_id, intval( $r['mission_id'] ), $progress );
            }
        }
        $r['progress'] = $progress;
        unset( $r['user_progress'], $r['action_total'] );
    }

    return $rows;
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
    $goal = intval( $wpdb->get_var( $wpdb->prepare( "SELECT goal FROM WPC_missions WHERE mission_id=%d", $mission_id ) ) );
    $wpdb->query( $wpdb->prepare(
        "UPDATE WPC_user_missions SET completed_at = NOW(), progress = %d WHERE user_id=%d AND mission_id=%d AND completed_at IS NULL",
        $goal,
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

/**
 * Get total loyalty points earned from missions only.
 *
 * @param int $user_id Optional user ID.
 * @return int Total mission points.
 */
function customiizer_get_total_mission_points( $user_id = 0 ) {
    global $wpdb;
    $user_id = $user_id ? intval( $user_id ) : get_current_user_id();
    if ( $user_id <= 0 ) {
        return 0;
    }

    // Primary method: sum rewards of completed missions
    $sql = $wpdb->prepare(
        "SELECT COALESCE(SUM(m.points_reward),0)
           FROM WPC_user_missions um
           INNER JOIN WPC_missions m ON um.mission_id = m.mission_id
          WHERE um.user_id = %d AND um.completed_at IS NOT NULL",
        $user_id
    );
    $points = intval( $wpdb->get_var( $sql ) );

    // Fallback to loyalty log for backwards compatibility
    if ( $points === 0 ) {
        $sql = $wpdb->prepare(
            "SELECT COALESCE(SUM(points),0) FROM WPC_loyalty_log
             WHERE user_id = %d AND origin = 'mission' AND type = 'credit'",
            $user_id
        );
        $points = intval( $wpdb->get_var( $sql ) );
    }

    return $points;
}

function customiizer_get_missions_version( $user_id = 0 ) {
    global $wpdb;
    $user_id = $user_id ? intval( $user_id ) : get_current_user_id();
    if ( $user_id <= 0 ) {
        return '';
    }
    $sql = $wpdb->prepare(
        "SELECT MAX(m.mission_id) AS max_id, COALESCE(SUM(um.progress),0) AS sum_prog, COUNT(um.completed_at) AS completed
         FROM WPC_missions m
         LEFT JOIN WPC_user_missions um ON m.mission_id = um.mission_id AND um.user_id = %d
         WHERE m.is_active = 1",
        $user_id
    );
    $row = $wpdb->get_row( $sql, ARRAY_A );
    if ( ! $row ) {
        return '';
    }
    return md5( $row['max_id'] . '-' . $row['sum_prog'] . '-' . $row['completed'] );
}

function customiizer_get_missions_version_ajax() {
    if ( ! is_user_logged_in() ) {
        wp_send_json_error( 'not_logged_in' );
    }
    $version = customiizer_get_missions_version( get_current_user_id() );
    wp_send_json_success( [ 'version' => $version ] );
}
add_action( 'wp_ajax_customiizer_get_missions_version', 'customiizer_get_missions_version_ajax' );

function customiizer_get_missions_ajax() {
    if ( ! is_user_logged_in() ) {
        wp_send_json_error( 'not_logged_in' );
    }
    $missions = customiizer_get_missions( get_current_user_id() );
    $version  = customiizer_get_missions_version( get_current_user_id() );
    wp_send_json_success( [
        'missions' => $missions,
        'version'  => $version,
    ] );
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

// -----------------------------------------------------------------------------
// Automatic mission triggers.
// -----------------------------------------------------------------------------

add_action( 'user_register', function( $user_id ) {
    customiizer_process_mission_action( 'user_register', $user_id, 1 );
} );

add_action( 'woocommerce_order_status_completed', function( $order_id ) {
    $order = wc_get_order( $order_id );
    if ( ! $order ) {
        return;
    }
    $user_id = $order->get_user_id();
    if ( $user_id ) {
        customiizer_process_mission_action( 'order_completed', $user_id, 1 );
    }
} );

