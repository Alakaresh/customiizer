<?php
$signin_nonce = wp_create_nonce('signin_nonce');
$signup_nonce = wp_create_nonce('signup_nonce');
?>
<head>
	<meta charset="utf-8">
       <!-- Style moved to assets.php -->
</head>

<div id="loginModal" class="login-modal" style="display: none;">
	<div class="loginModal-content">
		<div class="form-container">
			<!-- Partie Connexion -->
			<div class="login-box" id="signin">
				<div class="close">✖</div>
				<h2 class="title">Bienvenue sur Customiizer !</h2>
				<p class="new-user-prompt">Pas encore de compte ? <a href="#" id="showSignup">Créer un compte</a></p>

				<!-- Boutons sociaux désactivés temporairement -->
				<!--
 <button class="social-button facebook">Se connecter avec Facebook</button>
 <button class="social-button google">Se connecter avec Google</button>
 <button class="social-button apple">Se connecter avec Apple</button>
<hr class="split-line">
 -->


				<input type="email" class="input-box" placeholder="Adresse e-mail" required>
				<input type="password" class="input-box" placeholder="Mot de passe" required>
				<div class="remember-forget-box">
					<label>
						<input type="checkbox" name="remember"> Se souvenir de moi
					</label>
					<a href="#" id="showForgotPassword">Mot de passe oublié ?</a>
				</div>
				<button type="submit" class="signin-button">Se connecter</button>
				<input type="hidden" id="signin-nonce" value="<?php echo esc_attr( $signin_nonce ); ?>">
			</div>

			<!-- Étape intermédiaire avant inscription -->
			<div class="login-box" id="signupOptions" style="display: none;">
				<div class="close">✖</div>
				<h2 class="title">Créer votre compte Customiizer</h2>

				<!-- Boutons sociaux désactivés temporairement -->
				<!--
 <button class="social-button facebook">S'inscrire avec Facebook</button>
 <button class="social-button google">S'inscrire avec Google</button>
 <button class="social-button apple">S'inscrire avec Apple</button>
<hr class="split-line">
 -->


				<button class="email-signup-button" id="showEmailSignup">S'inscrire avec mon e-mail</button>
			</div>

			<!-- Inscription avec adresse e-mail -->
			<div class="login-box" id="signup" style="display: none;">
				<div class="close">✖</div>
				<h2 class="title">Inscription avec votre e-mail</h2>
				<input type="text" class="input-box" placeholder="Nom d'utilisateur">
				<input type="email" class="input-box" placeholder="Adresse e-mail*" required>
				<input type="password" class="input-box" placeholder="Mot de passe*" required>
				<input type="password" class="input-box" placeholder="Confirmer le mot de passe*" required>
				<button type="submit" class="signup-button">Créer mon compte</button>
				<input type="hidden" id="signup-nonce" value="<?php echo esc_attr( $signup_nonce ); ?>">
				<p>Déjà un compte ? <a href="#" id="showLogin">Se connecter</a></p>
			</div>
			<!-- Mot de passe oublié -->
			<div class="login-box" id="forgotPassword" style="display: none;">
				<div class="close">✖</div>
				<h2 class="title">Mot de passe oublié ?</h2>
				<p>Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.</p>
				<input type="email" class="input-box" id="reset-email" placeholder="Adresse e-mail" required>
				<button type="submit" class="reset-password-button">Envoyer</button>
				<p><a href="#" id="backToLogin">← Retour à la connexion</a></p>
			</div>
			<!-- Réinitialisation du mot de passe -->
			<div class="login-box" id="resetPasswordSection" style="display: none;">
				<div class="close">✖</div>
				<h2 class="title">Définir un nouveau mot de passe</h2>
				<input type="password" id="newPass1" name="new_password" class="input-box" placeholder="Nouveau mot de passe" autocomplete="new-password" required>
				<input type="password" id="newPass2" name="confirm_new_password" class="input-box" placeholder="Confirmer le mot de passe" autocomplete="new-password" required>

				<button class="confirm-reset-button">Valider</button>
				<p id="reset-feedback" style="color:white; margin-top:10px;"></p>
			</div>

		</div>

		<!-- Partie fixe avec visuel à droite -->
		<div class="login-background" style="background-image: url('/wp-content/themes/customiizer/assets/img/login-modal_bg.webp');">
			<div class="background-content">
				<h2 class="title_login">Donnez vie à vos idées avec Customiizer !</h2>
				<p><i class="fas fa-infinity"></i> Créez et Personnalisez à l'infini</p>
				<p><i class="fas fa-tools"></i> Outils avancés de personnalisation</p>
				<p><i class="fas fa-globe"></i> Accessible partout, tout le temps</p>
				<p><i class="fas fa-credit-card"></i> Commandez vos créations personnalisées</p>
			</div>
		</div>
	</div>
</div>

<!-- Script moved to assets.php -->
