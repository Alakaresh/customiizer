<?php
// Handle direct calls to this file
if (php_sapi_name() !== 'cli' && basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    $wpLoad = dirname(__DIR__, 4) . '/wp-load.php';
    if (file_exists($wpLoad)) {
        require_once $wpLoad;
    } else {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(['error' => 'wp-load.php not found']);
        exit;
    }

    $body    = file_get_contents('php://input');
    $data    = json_decode($body, true) ?: [];
    $headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];

    $response = customiizer_process_log_client($data, $headers);
    $status   = $response instanceof WP_REST_Response ? $response->get_status() : 200;
    $output   = $response instanceof WP_REST_Response ? $response->get_data() : $response;

    header('Content-Type: application/json');
    http_response_code($status);
    echo json_encode($output);
    exit;
}

// Register REST route when loaded through WordPress
register_rest_route('api/v1', '/log_client', [
    'methods'             => 'POST',
    'callback'            => 'customiizer_api_log_client',
    'permission_callback' => '__return_true',
]);

function customiizer_api_log_client( WP_REST_Request $request ) {
    return customiizer_process_log_client(
        $request->get_json_params(),
        [
            'x-wp-nonce' => $request->get_header('x-wp-nonce'),
        ]
    );
}

/**
 * Core handler shared by direct calls and REST requests.
 *
 * @param array $data    Decoded JSON payload.
 * @param array $headers Lower-cased request headers (unused).
 * @return array|WP_REST_Response
 */
function customiizer_process_log_client(array $data, array $headers) {
    // Previously enforced a secret header for authorization. This check has been removed to
    // simplify log collection.

    $userId    = $data['userId'] ?? null;
    $sessionId = $data['sessionId'] ?? null;
    $level     = $data['level'] ?? null;
    $message   = $data['message'] ?? null;
    $extra     = $data['extra'] ?? [];
    $requestId = $data['requestId'] ?? null;

    // Validate userId, allow anonymous (0) if missing or invalid
    if (!is_numeric($userId) || intval($userId) < 0) {
        $userId = 0;
    } else {
        $userId = intval($userId);
    }

    // Validate sessionId (alphanumeric + _-). Generate UUID if invalid
    if (!is_string($sessionId) || $sessionId === '' || !preg_match('/^[A-Za-z0-9_-]+$/', $sessionId)) {
        if (function_exists('wp_generate_uuid4')) {
            $sessionId = wp_generate_uuid4();
        } else {
            $sessionId = uniqid('sess_', true);
        }
    }

    // Validate level
    $allowed_levels = ['debug', 'info', 'warn', 'error'];
    if (!is_string($level) || !in_array(strtolower($level), $allowed_levels, true)) {
        return new WP_REST_Response(['error' => 'Invalid level'], 400);
    }
    $level = strtoupper($level);

    // Validate message
    if (!is_string($message) || $message === '') {
        return new WP_REST_Response(['error' => 'Invalid message'], 400);
    }

    // Validate extra
    if (!is_array($extra)) {
        return new WP_REST_Response(['error' => 'Invalid extra'], 400);
    }

    // Validate requestId if provided
    if ($requestId !== null) {
        if (!is_string($requestId) || !wp_is_uuid($requestId)) {
            return new WP_REST_Response(['error' => 'Invalid requestId'], 400);
        }
    }

    // Log
    customiizer_log('front', $userId, $sessionId, $level, $message, $extra, $requestId);

    return ['status' => 'ok'];
}

