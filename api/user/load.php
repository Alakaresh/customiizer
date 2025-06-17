<?php
register_rest_route('api/v1/user', '/load', [
	'methods'  => 'GET',
	'callback' => 'customiizer_user_load_flexible',
	'permission_callback' => '__return_true'
]);
function customiizer_user_load_flexible($request) {
	global $wpdb;

	$user_id = intval($request->get_param('user_id'));
	if (!$user_id || !get_userdata($user_id)) {
		return new WP_REST_Response(['success' => false, 'message' => 'Utilisateur introuvable'], 404);
	}

	// Demande de données spécifiques
	$include = explode(',', strtolower($request->get_param('include') ?? 'all'));

	$response = [];

	if (in_array('wp_user', $include) || in_array('all', $include)) {
		$wp_user = get_userdata($user_id);
		$response['wp_user'] = [
			'user_id'      => $wp_user->ID,
			'user_email'   => $wp_user->user_email,
			'display_name' => $wp_user->display_name,
			'user_login'   => $wp_user->user_login
		];
	}

	if (!in_array('wp_user', $include) || count($include) > 1) {
		$table = 'WPC_users';
		$row = $wpdb->get_row(
			$wpdb->prepare("SELECT * FROM $table WHERE user_id = %d", $user_id),
			ARRAY_A
		);

		if (!$row) {
			return new WP_REST_Response(['success' => false, 'message' => 'Utilisateur introuvable dans WPC_users'], 409);
		}

		// Soit tout, soit les champs demandés
		if (in_array('all', $include)) {
			$response['wpc_user'] = $row;
		} else {
			foreach ($include as $field) {
				if (isset($row[$field])) {
					$response[$field] = $row[$field];
				}
			}
		}
	}

	return new WP_REST_Response([
		'success' => true,
		'data' => $response
	]);
}