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
                                <button type="button" class="close" aria-label="Fermer le module de connexion">✖</button>
                               <div class="login-heading">
                                       <h2 class="title">Bienvenue sur Customiizer&nbsp;!</h2>
                                       <p class="new-user-prompt">Pas encore de compte&nbsp;? <a href="#" id="showSignup">Créer un compte</a></p>
                               </div>

                                <button class="social-button google" id="googleLoginBtn">
                                        <span class="social-icon" aria-hidden="true"><i class="fab fa-google"></i></span>
                                        <span class="social-label">Se connecter avec Google</span>
                                </button>
                                <div class="split-line" role="separator" aria-label="ou"></div>

                                <div class="input-group">
                                        <label class="sr-only" for="signin-email">Adresse e-mail</label>
                                        <span class="input-icon" aria-hidden="true"><i class="far fa-envelope"></i></span>
                                        <input id="signin-email" type="email" class="input-box" placeholder="Adresse e-mail" required>
                                </div>
                                <div class="input-group">
                                        <label class="sr-only" for="signin-password">Mot de passe</label>
                                        <span class="input-icon" aria-hidden="true"><i class="fas fa-lock"></i></span>
                                        <input id="signin-password" type="password" class="input-box" placeholder="Mot de passe" required>
                                </div>
                                <div class="remember-forget-box">
                                        <label class="remember-option">
                                                <input type="checkbox" name="remember">
                                                <span>Se souvenir de moi</span>
                                        </label>
                                        <a class="forgot-link" href="#" id="showForgotPassword">Mot de passe oublié&nbsp;?</a>
                                </div>
                                <button type="submit" class="signin-button">Se connecter</button>
                                <input type="hidden" id="signin-nonce" value="<?php echo esc_attr( $signin_nonce ); ?>">
                        </div>

			<!-- Étape intermédiaire avant inscription -->
                        <div class="login-box" id="signupOptions" style="display: none;">
                                <button type="button" class="close" aria-label="Fermer le module d'inscription">✖</button>
                                <button type="button" class="back-button" data-target="signin" aria-label="Retour à la connexion">
                                        <span aria-hidden="true">←</span>
                                </button>
                               <div class="login-heading">
                                       <h2 class="title">Créer votre compte Customiizer</h2>
                               </div>

                                <button class="social-button google" id="googleSignupBtn">
                                        <span class="social-icon" aria-hidden="true"><i class="fab fa-google"></i></span>
                                        <span class="social-label">S'inscrire avec Google</span>
                                </button>
                                <div class="split-line" role="separator" aria-label="ou"></div>

                                <button class="email-signup-button" id="showEmailSignup">S'inscrire avec mon e-mail</button>
                        </div>

                        <!-- Inscription avec adresse e-mail -->
                        <div class="login-box" id="signup" style="display: none;">
                                <button type="button" class="close" aria-label="Fermer le module d'inscription">✖</button>
                                <button type="button" class="back-button" data-target="signupOptions" aria-label="Retour à l'étape précédente">
                                        <span aria-hidden="true">←</span>
                                </button>
                               <div class="login-heading">
                                       <h2 class="title">Inscription avec votre e-mail</h2>
                               </div>
                                <div class="input-group">
                                        <label class="sr-only" for="signup-username">Nom d'utilisateur</label>
                                        <span class="input-icon" aria-hidden="true"><i class="far fa-user"></i></span>
                                        <input id="signup-username" type="text" class="input-box" placeholder="Nom d'utilisateur">
                                </div>
                                <div class="input-group">
                                        <label class="sr-only" for="signup-email">Adresse e-mail*</label>
                                        <span class="input-icon" aria-hidden="true"><i class="far fa-envelope"></i></span>
                                        <input id="signup-email" type="email" class="input-box" placeholder="Adresse e-mail*" required>
                                </div>
                                <div class="input-group">
                                        <label class="sr-only" for="signup-password">Mot de passe*</label>
                                        <span class="input-icon" aria-hidden="true"><i class="fas fa-lock"></i></span>
                                        <input id="signup-password" type="password" class="input-box" placeholder="Mot de passe*" required>
                                </div>
                                <div class="input-group">
                                        <label class="sr-only" for="signup-password-confirmation">Confirmer le mot de passe*</label>
                                        <span class="input-icon" aria-hidden="true"><i class="fas fa-lock"></i></span>
                                        <input id="signup-password-confirmation" type="password" class="input-box" placeholder="Confirmer le mot de passe*" required>
                                </div>
                                <button type="submit" class="signup-button">Créer mon compte</button>
                                <input type="hidden" id="signup-nonce" value="<?php echo esc_attr( $signup_nonce ); ?>">
                                <p>Déjà un compte ? <a href="#" id="showLogin">Se connecter</a></p>
                        </div>
                        <!-- Mot de passe oublié -->
                        <div class="login-box" id="forgotPassword" style="display: none;">
                                <button type="button" class="close" aria-label="Fermer le module de récupération du mot de passe">✖</button>
                               <div class="login-heading">
                                       <h2 class="title">Mot de passe oublié&nbsp;?</h2>
                               </div>
                                <p class="section-intro">Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.</p>
                                <div class="input-group">
                                        <label class="sr-only" for="reset-email">Adresse e-mail</label>
                                        <span class="input-icon" aria-hidden="true"><i class="far fa-envelope"></i></span>
                                        <input type="email" class="input-box" id="reset-email" placeholder="Adresse e-mail" required>
                                </div>
                                <button type="submit" class="reset-password-button">Envoyer</button>
                                <p><a href="#" id="backToLogin">← Retour à la connexion</a></p>
                        </div>
                        <!-- Réinitialisation du mot de passe -->
                        <div class="login-box" id="resetPasswordSection" style="display: none;">
                                <button type="button" class="close" aria-label="Fermer le module de nouveau mot de passe">✖</button>
                               <div class="login-heading">
                                       <h2 class="title">Définir un nouveau mot de passe</h2>
                               </div>
                                <div class="input-group">
                                        <label class="sr-only" for="newPass1">Nouveau mot de passe</label>
                                        <span class="input-icon" aria-hidden="true"><i class="fas fa-lock"></i></span>
                                        <input type="password" id="newPass1" name="new_password" class="input-box" placeholder="Nouveau mot de passe" autocomplete="new-password" required>
                                </div>
                                <div class="input-group">
                                        <label class="sr-only" for="newPass2">Confirmer le mot de passe</label>
                                        <span class="input-icon" aria-hidden="true"><i class="fas fa-lock"></i></span>
                                        <input type="password" id="newPass2" name="confirm_new_password" class="input-box" placeholder="Confirmer le mot de passe" autocomplete="new-password" required>
                                </div>

                                <button class="confirm-reset-button">Valider</button>
                                <p id="reset-feedback" style="color:white; margin-top:10px;"></p>
                        </div>

		</div>

		<!-- Partie fixe avec visuel à droite -->
               <div class="login-background" style="background-image: url('https://customiizer.blob.core.windows.net/assets/SiteDesign/backgrounds/background_login.png');">
                        <div class="background-overlay" aria-hidden="true"></div>
                        <div class="background-content">
                                <span class="background-eyebrow">L'atelier des créateurs</span>
                                <h2 class="title_login">Donnez vie à vos idées avec Customiizer&nbsp;!</h2>
                                <ul class="background-list">
                                        <li>
                                                <span class="feature-icon" aria-hidden="true"><i class="fas fa-infinity"></i></span>
                                                <span class="feature-text">Créez et personnalisez à l'infini</span>
                                        </li>
                                        <li>
                                                <span class="feature-icon" aria-hidden="true"><i class="fas fa-tools"></i></span>
                                                <span class="feature-text">Outils avancés de personnalisation</span>
                                        </li>
                                        <li>
                                                <span class="feature-icon" aria-hidden="true"><i class="fas fa-globe"></i></span>
                                                <span class="feature-text">Accessible partout, tout le temps</span>
                                        </li>
                                        <li>
                                                <span class="feature-icon" aria-hidden="true"><i class="fas fa-credit-card"></i></span>
                                                <span class="feature-text">Commandez vos créations personnalisées</span>
                                        </li>
                                </ul>
                        </div>
                </div>
        </div>
</div>

<!-- Script moved to assets.php -->
