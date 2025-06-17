<?php
function get_user_details() {
	// Vérifier si un utilisateur est connecté
	$current_user = wp_get_current_user();
	if ($current_user->ID === 0) {
		wp_send_json_error('No user is currently logged in.');
		wp_die();
	}

	// Générer un nonce pour le formulaire de changement de mot de passe
	$password_nonce = wp_create_nonce('password_change_action');

	// Renvoyer les détails de l'utilisateur et le nonce
	wp_send_json_success(array(
		'display_name' => $current_user->display_name,
		'email' => $current_user->user_email,
		'password_nonce' => $password_nonce
	));

	wp_die();
}

add_action('wp_ajax_get_user_details', 'get_user_details');


function update_user_details() {
	global $wpdb;

	// Vérifier si l'utilisateur est connecté
	$current_user = wp_get_current_user();
	if ($current_user->ID === 0) {
		wp_send_json_error(['message' => 'Aucun utilisateur connecté.']);
		wp_die();
	}

	// Vérifier si un display_name est fourni
	if (!isset($_POST['display_name']) || empty($_POST['display_name'])) {
		wp_send_json_error(['message' => 'Le nom d\'utilisateur est requis.']);
		wp_die();
	}

	$display_name = sanitize_text_field($_POST['display_name']);
	$user_id = $current_user->ID;

	// Vérifier si ce login est déjà utilisé par un autre utilisateur
	$existing_user = get_user_by('login', $display_name);
	if ($existing_user && $existing_user->ID !== $user_id) {
		wp_send_json_error(['message' => 'Ce nom d’utilisateur est déjà utilisé.']);
		wp_die();
	}

	// Vérifier si le nicename est déjà pris (slug public)
	$existing_nicename = $wpdb->get_var(
		$wpdb->prepare("SELECT ID FROM {$wpdb->users} WHERE user_nicename = %s AND ID != %d", $display_name, $user_id)
	);
	if ($existing_nicename) {
		wp_send_json_error(['message' => 'Ce nom d’utilisateur est déjà pris en tant que "nicename".']);
		wp_die();
	}

	// Préparer la mise à jour
	$data = array(
		'ID' => $user_id,
		'user_nicename' => $display_name,
		'display_name'  => $display_name
	);

	// Mettre à jour l'utilisateur
	$result = wp_update_user($data);

	if (is_wp_error($result)) {
		wp_send_json_error(['message' => 'Échec de la mise à jour utilisateur.']);
		wp_die();
	}

	// Rafraîchir la session
	wp_set_current_user($user_id);

	wp_send_json_success(['message' => 'Profil mis à jour avec succès.']);
	wp_die();
}


add_action('wp_ajax_update_user_details', 'update_user_details');

function change_user_password() {
	// Vérifier la validité du nonce
	if (!isset($_POST['password_nonce']) || !wp_verify_nonce($_POST['password_nonce'], 'password_change_action')) {
		wp_send_json_error('Nonce verification failed.');
		wp_die();
	}

	// Récupérer l'utilisateur actuellement connecté
	$current_user = wp_get_current_user();

	// Vérifier si un utilisateur est connecté
	if ($current_user->ID === 0) {
		wp_send_json_error('No user is currently logged in.');
		wp_die();
	}

	// Assainir et valider les données reçues
	$current_password = sanitize_text_field($_POST['current_password']);
	$new_password = sanitize_text_field($_POST['new_password']);
	$confirm_new_password = sanitize_text_field($_POST['confirm_new_password']);

	// Vérifier les conditions
	if ($new_password !== $confirm_new_password) {
		wp_send_json_error('Passwords do not match.');
		wp_die();
	}

	// Vérifier le mot de passe actuel
	if (!wp_check_password($current_password, $current_user->user_pass, $current_user->ID)) {
		wp_send_json_error('Current password is incorrect.');
		wp_die();
	}

	// Mettre à jour le mot de passe
	wp_set_password($new_password, $current_user->ID);
	wp_send_json_success('Password changed successfully.');

	wp_die();
}

add_action('wp_ajax_change_user_password', 'change_user_password');