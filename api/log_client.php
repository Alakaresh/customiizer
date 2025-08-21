<?php
register_rest_route('api/v1', '/log_client', [
	'methods' => 'POST',
	'callback' => 'customiizer_api_log_client',
	'permission_callback' => '__return_true',
]);

function customiizer_api_log_client( WP_REST_Request $request ) {
	// Security: check WordPress nonce or secret header
	$authorized = false;
	$nonce = $request->get_header( 'x-wp-nonce' );
	if ( $nonce && wp_verify_nonce( $nonce, 'wp_rest' ) ) {
		$authorized = true;
	} else {
		$secret_header = $request->get_header( 'x-customiizer-secret' );
		if ( $secret_header && defined( 'CUSTOMIIZER_LOG_SECRET' ) ) {
			$authorized = hash_equals( CUSTOMIIZER_LOG_SECRET, $secret_header );
		}
	}

	if ( ! $authorized ) {
		return new WP_REST_Response( [ 'error' => 'Unauthorized' ], 403 );
	}

	$data = $request->get_json_params();
	$userId    = $data['userId'] ?? null;
	$sessionId = $data['sessionId'] ?? null;
	$level     = $data['level'] ?? null;
	$message   = $data['message'] ?? null;
	$extra     = $data['extra'] ?? [];

	// Validate userId
	if ( ! is_numeric( $userId ) || intval( $userId ) < 0 ) {
		return new WP_REST_Response( [ 'error' => 'Invalid userId' ], 400 );
	}
	$userId = intval( $userId );

	// Validate sessionId (alphanumeric + _-)
	if ( ! is_string( $sessionId ) || $sessionId === '' || ! preg_match( '/^[A-Za-z0-9_-]+$/', $sessionId ) ) {
		return new WP_REST_Response( [ 'error' => 'Invalid sessionId' ], 400 );
	}

	// Validate level
	$allowed_levels = [ 'debug', 'info', 'warn', 'error' ];
	if ( ! is_string( $level ) || ! in_array( strtolower( $level ), $allowed_levels, true ) ) {
		return new WP_REST_Response( [ 'error' => 'Invalid level' ], 400 );
	}
	$level = strtoupper( $level );

	// Validate message
	if ( ! is_string( $message ) || $message === '' ) {
		return new WP_REST_Response( [ 'error' => 'Invalid message' ], 400 );
	}

	// Validate extra
	if ( ! is_array( $extra ) ) {
		return new WP_REST_Response( [ 'error' => 'Invalid extra' ], 400 );
	}

	// Log
	customiizer_log( 'front', $userId, $sessionId, $message, $level, $extra );

	return [ 'status' => 'ok' ];
}
