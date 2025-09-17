<?php
function user_signup() {
	// Vérification de la méthode POST pour sécuriser le traitement des données
        if ($_SERVER['REQUEST_METHOD'] != 'POST') {
                wp_send_json_error(array('message' => 'Méthode de requête invalide.'));
                return;
        }

        if (!isset($_POST['registration_nonce'])) {
                wp_send_json_error(array('message' => 'Nonce absent.'));
                return;
        }

	// Vérifiez si le nonce est valide
	$nonce = $_POST['registration_nonce'];
        if (!wp_verify_nonce($nonce, 'signup_nonce')) {
                wp_send_json_error(array('message' => 'Échec de la vérification du nonce.'));
                return;
        }

	// Collecter et nettoyer les données du formulaire
	$username = sanitize_user($_POST['username']);
	$email = sanitize_email($_POST['email']);
	$password = sanitize_text_field($_POST['password']);
	$confirm_password = sanitize_text_field($_POST['confirm_password']);

	// Valider les données
        if (empty($email) || empty($password) || empty($confirm_password)) {
                wp_send_json_error(array('message' => 'Veuillez remplir tous les champs obligatoires.'));
                return;
        }

	// Générer un user_login unique basé sur le timestamp actuel
	$user_login = 'user-' . time();

	if (empty($username)) {
		$username = $user_login;  // Utiliser user_login comme user_nicename si aucun username n'est fourni
	}

        if (username_exists($user_login) || email_exists($email)) {
                wp_send_json_error(array('message' => 'Le nom d’utilisateur ou l’e-mail existe déjà.'));
                return;
        }

        if ($password !== $confirm_password) {
                wp_send_json_error(array('message' => 'Les mots de passe ne correspondent pas.'));
                return;
        }

	// Préparation des données utilisateur
	$userdata = array(
		'user_login' => $user_login,
		'user_pass'  => $password,
		'user_email' => $email,
		'user_nicename' => $username,
		'user_display_name' => $username,
	);

        // Créer l'utilisateur
        $user_id = wp_insert_user($userdata);

        if ( function_exists( 'customiizer_log' ) ) {
                customiizer_log( 'signup', "wp_insert_user returned {$user_id}" );
        }

        if (is_wp_error($user_id)) {
                wp_send_json_error(array('message' => 'Échec de création de l’utilisateur : ' . $user_id->get_error_message()));
                return;
        }

	// ⚠️ Nécessaire pour mettre à jour correctement le display_name
	wp_update_user(array(
		'ID' => $user_id,
		'display_name' => $username
	));


	// Initialisation dans la table WPC_client
	global $wpdb;
        $wpdb->insert(
                'WPC_users',  // Nom de la table
                array(
                        'user_id' => $user_id,
                        'image_credits' => 30  // Définir les crédits d'image initiaux à 30
                ),
               array('%d', '%d')  // Les formats de chaque champ
        );

        if ( function_exists( 'customiizer_log' ) ) {
                customiizer_log( 'signup', "inserted WPC_users for {$user_id}" );
        }

        // Enregistrer le parrain dans la table WPC_referrals
        $referrer_id = isset($_POST['referrer_id']) ? intval($_POST['referrer_id']) : 0;
        if ($referrer_id > 0 && get_user_by('ID', $referrer_id)) {
                update_user_meta($user_id, 'referrer_id', $referrer_id);
                $wpdb->insert(
                        'WPC_referrals',
                        [
                                'referrer_id' => $referrer_id,
                                'referred_id' => $user_id,
                                'created_at'  => current_time('mysql')
                        ],
                        ['%d', '%d', '%s']
                );

                if ( function_exists( 'customiizer_log' ) ) {
                        customiizer_log( 'signup', "inserted referral {$referrer_id} -> {$user_id}" );
                }

                if (function_exists('customiizer_add_loyalty_points')) {
                customiizer_add_loyalty_points($referrer_id, 500, 'referral', 'Nouveau filleul');
                customiizer_add_loyalty_points($user_id, 500, 'referral', 'Inscription parrainée');
                }
                if (function_exists('customiizer_process_mission_action')) {
                        customiizer_process_mission_action('referral', $referrer_id, 1);
                }
        }

	// Connexion automatique après inscription
        wp_set_current_user($user_id);
        wp_set_auth_cookie($user_id);

        if ( function_exists( 'customiizer_log' ) ) {
                customiizer_log( 'signup', "login user {$user_id}" );
        }

        wp_send_json_success();
}
add_action('wp_ajax_user_signup', 'user_signup');
add_action('wp_ajax_nopriv_user_signup', 'user_signup');

function custom_reset_password_request() {
	if (empty($_POST['email']) || !is_email($_POST['email'])) {
		wp_send_json_error(['message' => 'Adresse e-mail invalide.']);
	}

	$email = sanitize_email($_POST['email']);

	$user = get_user_by('email', $email);
	if (!$user) {
		wp_send_json_error(['message' => 'Aucun utilisateur trouvé avec cette adresse e-mail.']);
	}

	// Déclenche le processus de récupération de mot de passe natif WordPress
	$result = retrieve_password($user->user_login);

	if (true === $result) {
		wp_send_json_success(['message' => 'E-mail de réinitialisation envoyé.']);
	} else {
		wp_send_json_error(['message' => 'Impossible d’envoyer l’e-mail.']);
	}
}
add_action('wp_ajax_nopriv_reset_password_request', 'custom_reset_password_request');

function custom_update_password() {
	$login = sanitize_user($_POST['login']);
	$key = sanitize_text_field($_POST['key']);
	$pass1 = $_POST['pass1'];
	$pass2 = $_POST['pass2'];

	if ($pass1 !== $pass2) {
		wp_send_json_error(['message' => 'Les mots de passe ne correspondent pas.']);
	}

	$user = check_password_reset_key($key, $login);

	if (is_wp_error($user)) {
		wp_send_json_error(['message' => 'Clé invalide ou expirée.']);
	}

	reset_password($user, $pass1);
	wp_send_json_success(['message' => '🎉 Mot de passe mis à jour avec succès !']);
}
add_action('wp_ajax_nopriv_custom_update_password', 'custom_update_password');