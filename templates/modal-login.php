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
                                <button type="button" class="close" aria-label="Fermer">✖</button>
                                <div class="login-box-header">
                                        <span class="section-label">Connexion</span>
                                        <h2 class="title">Bienvenue sur Customiizer !</h2>
                                        <p class="new-user-prompt">Pas encore de compte ? <a href="#" id="showSignup">Créer un compte</a></p>
                                </div>
                                <div class="social-login">
                                        <button class="social-button google" id="googleLoginBtn">
                                                <span class="icon" aria-hidden="true"><i class="fab fa-google"></i></span>
                                                <span>Se connecter avec Google</span>
                                        </button>
                                </div>
                                <div class="divider">
                                        <span>Ou continuez avec e-mail</span>
                                </div>
                                <label class="input-field">
                                        <span class="field-label">Adresse e-mail</span>
                                        <input type="email" class="input-box" placeholder="nom@exemple.com" required>
                                </label>
                                <label class="input-field">
                                        <span class="field-label">Mot de passe</span>
                                        <input type="password" class="input-box" placeholder="••••••••" required>
                                </label>
                                <div class="remember-forget-box">
                                        <label class="remember-me">
                                                <input type="checkbox" name="remember"> Se souvenir de moi
                                        </label>
                                        <a href="#" id="showForgotPassword">Mot de passe oublié ?</a>
                                </div>
                                <button type="submit" class="signin-button">Accéder à mon espace</button>
                                <input type="hidden" id="signin-nonce" value="<?php echo esc_attr( $signin_nonce ); ?>">
                        </div>

                        <!-- Étape intermédiaire avant inscription -->
                        <div class="login-box" id="signupOptions" style="display: none;">
                                <button type="button" class="close" aria-label="Fermer">✖</button>
                                <div class="login-box-header">
                                        <span class="section-label">Inscription</span>
                                        <h2 class="title">Créer votre compte Customiizer</h2>
                                </div>
                                <div class="social-login">
                                        <button class="social-button google" id="googleSignupBtn">
                                                <span class="icon" aria-hidden="true"><i class="fab fa-google"></i></span>
                                                <span>S'inscrire avec Google</span>
                                        </button>
                                </div>
                                <div class="divider">
                                        <span>Ou continuez avec e-mail</span>
                                </div>
                                <button class="email-signup-button" id="showEmailSignup">S'inscrire avec mon e-mail</button>
                        </div>

                        <!-- Inscription avec adresse e-mail -->
                        <div class="login-box" id="signup" style="display: none;">
                                <button type="button" class="close" aria-label="Fermer">✖</button>
                                <div class="login-box-header">
                                        <span class="section-label">Inscription</span>
                                        <h2 class="title">Inscription avec votre e-mail</h2>
                                </div>
                                <label class="input-field">
                                        <span class="field-label">Nom d'utilisateur</span>
                                        <input type="text" class="input-box" placeholder="Votre pseudonyme">
                                </label>
                                <label class="input-field">
                                        <span class="field-label">Adresse e-mail*</span>
                                        <input type="email" class="input-box" placeholder="nom@exemple.com" required>
                                </label>
                                <label class="input-field">
                                        <span class="field-label">Mot de passe*</span>
                                        <input type="password" class="input-box" placeholder="Créez un mot de passe" required>
                                </label>
                                <label class="input-field">
                                        <span class="field-label">Confirmer le mot de passe*</span>
                                        <input type="password" class="input-box" placeholder="Confirmez le mot de passe" required>
                                </label>
                                <button type="submit" class="signup-button">Créer mon compte</button>
                                <input type="hidden" id="signup-nonce" value="<?php echo esc_attr( $signup_nonce ); ?>">
                                <p class="switch-auth">Déjà un compte ? <a href="#" id="showLogin">Se connecter</a></p>
                        </div>
                        <!-- Mot de passe oublié -->
                        <div class="login-box" id="forgotPassword" style="display: none;">
                                <button type="button" class="close" aria-label="Fermer">✖</button>
                                <div class="login-box-header">
                                        <span class="section-label">Assistance</span>
                                        <h2 class="title">Mot de passe oublié ?</h2>
                                </div>
                                <p class="helper-text">Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.</p>
                                <label class="input-field">
                                        <span class="field-label">Adresse e-mail</span>
                                        <input type="email" class="input-box" id="reset-email" placeholder="nom@exemple.com" required>
                                </label>
                                <button type="submit" class="reset-password-button">Envoyer le lien</button>
                                <p class="switch-auth"><a href="#" id="backToLogin">← Retour à la connexion</a></p>
                        </div>
                        <!-- Réinitialisation du mot de passe -->
                        <div class="login-box" id="resetPasswordSection" style="display: none;">
                                <button type="button" class="close" aria-label="Fermer">✖</button>
                                <div class="login-box-header">
                                        <span class="section-label">Assistance</span>
                                        <h2 class="title">Définir un nouveau mot de passe</h2>
                                </div>
                                <label class="input-field">
                                        <span class="field-label">Nouveau mot de passe</span>
                                        <input type="password" id="newPass1" name="new_password" class="input-box" placeholder="••••••••" autocomplete="new-password" required>
                                </label>
                                <label class="input-field">
                                        <span class="field-label">Confirmer le mot de passe</span>
                                        <input type="password" id="newPass2" name="confirm_new_password" class="input-box" placeholder="••••••••" autocomplete="new-password" required>
                                </label>

                                <button class="confirm-reset-button">Valider</button>
                                <p id="reset-feedback" class="reset-feedback"></p>
                        </div>

                </div>

                <!-- Partie fixe avec visuel à droite -->
                <div class="login-background" style="background-image: url('/wp-content/themes/customiizer/assets/img/login-modal_bg.webp');">
                        <div class="background-overlay"></div>
                        <div class="background-content">
                                <span class="experience-label">+ L'expérience Customiizer</span>
                                <h2 class="title_login">Donnez vie à vos idées avec Customiizer !</h2>
                                <ul class="experience-list">
                                        <li><i class="fas fa-infinity"></i>Créez et personnalisez à l'infini</li>
                                        <li><i class="fas fa-tools"></i>Outils avancés de personnalisation</li>
                                        <li><i class="fas fa-globe"></i>Accessible partout, tout le temps</li>
                                        <li><i class="fas fa-credit-card"></i>Commandez vos créations personnalisées</li>
                                </ul>
                        </div>
                </div>
        </div>
</div>

<!-- Script moved to assets.php -->
