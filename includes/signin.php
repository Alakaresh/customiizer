<?php
function user_signin() {
	// Vérifier le nonce
	if (!isset($_POST['registration_nonce'])) {
		wp_send_json_error(array('message' => 'Nonce is not set.'));
		return;
	}

	// Vérifiez si le nonce est valide
	$nonce = $_POST['registration_nonce'];
	if (!wp_verify_nonce($nonce, 'signin_nonce')) {
		wp_send_json_error(array('message' => 'Nonce verification failed.'));
		return;
	}

	// Le reste de votre code de connexion
	$info = array(
		'user_login' => sanitize_email($_POST['email']),
		'user_password' => $_POST['password'],
		'remember' => !empty($_POST['remember']) && $_POST['remember'] === '1'
	);

	$user_signon = wp_signon($info, false);
	if (is_wp_error($user_signon)) {
		wp_send_json_error(array('message' => 'Wrong email or password.'));
	} else {
		wp_send_json_success(array('message' => 'Login successful.'));
	}

	die();
}
add_action('wp_ajax_nopriv_user_signin', 'user_signin');

