<?php
register_rest_route('api/v1/user', '/update', [
	'methods'  => 'POST',
	'callback' => 'customiizer_update_existing_user',
	'permission_callback' => '__return_true'

]);
function customiizer_update_existing_user($request) {
	global $wpdb;

	$data = $request->get_json_params();
	$user_id = intval($data['user_id'] ?? 0);

	if (!$user_id || !get_userdata($user_id)) {
		return new WP_REST_Response(['success' => false, 'message' => 'Utilisateur introuvable'], 404);
	}

	// 🔁 Mise à jour de display_name si fourni
	if (!empty($data['display_name'])) {
		wp_update_user([
			'ID'           => $user_id,
			'display_name' => sanitize_text_field($data['display_name'])
		]);
	}

	// 🔁 Mise à jour dans WPC_users uniquement si la ligne existe
	$table = 'WPC_users'; // pas de $wpdb->prefix si la table ne commence pas par le préfixe
	$exists = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $table WHERE user_id = %d", $user_id));

	if (!$exists) {
		return new WP_REST_Response(['success' => false, 'message' => 'Ligne utilisateur manquante dans WPC_users'], 409);
	}

	// Champs personnalisés pour WPC_users
	$fields = [];

	if (isset($data['image_credits']) && $data['image_credits'] !== '') {
		$fields['image_credits'] = intval($data['image_credits']);
	}
	if (isset($data['is_subscribed']) && $data['is_subscribed'] !== '') {
		$fields['is_subscribed'] = intval($data['is_subscribed']);
	}
	if (isset($data['email_verified']) && $data['email_verified'] !== '') {
		$fields['email_verified'] = intval($data['email_verified']);
	}
	if (!empty($data['last_login_change'])) {
		$fields['last_login_change'] = sanitize_text_field($data['last_login_change']);
	}
	if (!empty($data['level'])) {
		$fields['level'] = sanitize_text_field($data['level']);
	}
	if (!empty($data['user_logo'])) {
		$fields['user_logo'] = esc_url_raw($data['user_logo']);
	}
	if (!empty($data['user_banner'])) {
		$fields['user_banner'] = esc_url_raw($data['user_banner']);
	}
	if (isset($data['crop_x']) && $data['crop_x'] !== '') {
		$fields['crop_x'] = intval($data['crop_x']);
	}
	if (isset($data['crop_y']) && $data['crop_y'] !== '') {
		$fields['crop_y'] = intval($data['crop_y']);
	}
	if (isset($data['crop_width']) && $data['crop_width'] !== '') {
		$fields['crop_width'] = intval($data['crop_width']);
	}
	if (isset($data['crop_height']) && $data['crop_height'] !== '') {
		$fields['crop_height'] = intval($data['crop_height']);
	}


	// Filtrer uniquement les champs fournis
	$fields = array_filter($fields, function ($v) {
		return $v !== null;
	});

	$wpdb->update($table, $fields, ['user_id' => $user_id]);

	return new WP_REST_Response([
		'success' => true,
		'user_id' => $user_id,
		'updated_fields' => array_merge(array_keys($fields), !empty($data['display_name']) ? ['display_name'] : [])
	]);
}
