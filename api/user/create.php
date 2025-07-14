<?php
register_rest_route('api/v1/user', '/create', [
	'methods'  => 'POST',
	'callback' => 'customiizer_create_wpc_user_only',
        'permission_callback' => 'customiizer_api_permission'
]);
function customiizer_create_wpc_user_only($request) {
	global $wpdb;

	$data = $request->get_json_params();
	$user_id = intval($data['user_id'] ?? 0);

	if (!$user_id || !get_userdata($user_id)) {
		return new WP_REST_Response(['success' => false, 'message' => 'Utilisateur WordPress introuvable.'], 404);
	}

	// Vérifie s’il existe déjà dans WPC_users
	$table = 'WPC_users';
	$exists = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table WHERE user_id = %d", $user_id));

	if ($exists) {
		return new WP_REST_Response(['success' => false, 'message' => 'Utilisateur déjà existant dans WPC_users.'], 409);
	}

	// Création de la ligne WPC_users uniquement
	$wpdb->insert($table, [
		'user_id'           => $user_id,
		'image_credits'     => intval($data['image_credits'] ?? 0),
		'is_subscribed'     => 0,
		'email_verified'    => 0,
		'last_login_change' => null,
		'level'             => '',
		'user_logo'         => '',
		'user_banner'       => '',
		'crop_x'            => 0,
		'crop_y'            => 0,
		'crop_width'        => 256,
		'crop_height'       => 256
	]);

	return new WP_REST_Response([
		'success' => true,
		'user_id' => $user_id,
		'message' => 'Ligne créée dans WPC_users avec succès.'
	]);
}
