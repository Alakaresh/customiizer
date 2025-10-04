<?php
$signin_nonce = wp_create_nonce('signin_nonce');
$signup_nonce = wp_create_nonce('signup_nonce');
?>
<head>
	<meta charset="utf-8">
       <!-- Style moved to assets.php -->
</head>

<div id="loginModal" class="login-modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="loginModalTitle">
        <div class="loginModal-content" role="document">
                <div class="form-container">
                        <button type="button" class="login-modal__close close" aria-label="<?php esc_attr_e( 'Fermer', 'customiizer' ); ?>">
                                <span aria-hidden="true">&times;</span>
                        </button>

                        <!-- Partie Connexion -->
                        <div class="login-box" id="signin">
                                <div class="login-box__header">
                                        <span class="login-box__badge">Connexion</span>
                                        <h2 class="title" id="loginModalTitle">Bienvenue sur Customiizer&nbsp;!</h2>
                                        <p class="new-user-prompt">Pas encore de compte&nbsp;? <a href="#" id="showSignup">Créer un compte</a></p>
                                </div>

                                <div class="login-box__actions">
                                        <button class="social-button google" id="googleLoginBtn">
                                                <span class="social-button__icon"><i class="fab fa-google"></i></span>
                                                <span>Se connecter avec Google</span>
                                        </button>
                                        <div class="split-line" role="presentation"><span>ou continuez avec votre e-mail</span></div>
                                </div>

                                <label class="input-group">
                                        <span class="input-label">Adresse e-mail</span>
                                        <input type="email" class="input-box" placeholder="vous@example.com" required>
                                </label>

                                <label class="input-group">
                                        <span class="input-label">Mot de passe</span>
                                        <input type="password" class="input-box" placeholder="••••••••" required>
                                </label>

                                <div class="remember-forget-box">
                                        <label class="remember-me">
                                                <input type="checkbox" name="remember">
                                                <span>Se souvenir de moi</span>
                                        </label>
                                        <a href="#" id="showForgotPassword">Mot de passe oublié&nbsp;?</a>
                                </div>

                                <button type="submit" class="signin-button">Se connecter</button>
                                <input type="hidden" id="signin-nonce" value="<?php echo esc_attr( $signin_nonce ); ?>">
                        </div>

                        <!-- Étape intermédiaire avant inscription -->
                        <div class="login-box" id="signupOptions" style="display: none;">
                                <div class="login-box__header">
                                        <span class="login-box__badge">Inscription</span>
                                        <h2 class="title">Créer votre compte Customiizer</h2>
                                        <p class="login-box__subtitle">Choisissez votre méthode préférée pour démarrer.</p>
                                </div>

                                <div class="login-box__actions">
                                        <button class="social-button google" id="googleSignupBtn">
                                                <span class="social-button__icon"><i class="fab fa-google"></i></span>
                                                <span>S'inscrire avec Google</span>
                                        </button>
                                        <div class="split-line" role="presentation"><span>ou</span></div>
                                </div>

                                <button class="email-signup-button" id="showEmailSignup">S'inscrire avec mon e-mail</button>
                        </div>

                        <!-- Inscription avec adresse e-mail -->
                        <div class="login-box" id="signup" style="display: none;">
                                <div class="login-box__header">
                                        <span class="login-box__badge">Inscription</span>
                                        <h2 class="title">Inscription avec votre e-mail</h2>
                                        <p class="login-box__subtitle">Renseignez vos informations pour créer votre profil.</p>
                                </div>

                                <label class="input-group">
                                        <span class="input-label">Nom d'utilisateur</span>
                                        <input type="text" class="input-box" placeholder="Votre pseudo">
                                </label>
                                <label class="input-group">
                                        <span class="input-label">Adresse e-mail*</span>
                                        <input type="email" class="input-box" placeholder="vous@example.com" required>
                                </label>
                                <label class="input-group">
                                        <span class="input-label">Mot de passe*</span>
                                        <input type="password" class="input-box" placeholder="••••••••" required>
                                </label>
                                <label class="input-group">
                                        <span class="input-label">Confirmer le mot de passe*</span>
                                        <input type="password" class="input-box" placeholder="••••••••" required>
                                </label>
                                <button type="submit" class="signup-button">Créer mon compte</button>
                                <input type="hidden" id="signup-nonce" value="<?php echo esc_attr( $signup_nonce ); ?>">
                                <p class="login-box__helper">Déjà un compte&nbsp;? <a href="#" id="showLogin">Se connecter</a></p>
                        </div>

                        <!-- Mot de passe oublié -->
                        <div class="login-box" id="forgotPassword" style="display: none;">
                                <div class="login-box__header">
                                        <span class="login-box__badge">Assistance</span>
                                        <h2 class="title">Mot de passe oublié&nbsp;?</h2>
                                        <p class="login-box__subtitle">Entrez votre e-mail pour recevoir un lien de réinitialisation.</p>
                                </div>
                                <label class="input-group">
                                        <span class="input-label">Adresse e-mail</span>
                                        <input type="email" class="input-box" id="reset-email" placeholder="vous@example.com" required>
                                </label>
                                <button type="submit" class="reset-password-button">Envoyer</button>
                                <p class="login-box__helper"><a href="#" id="backToLogin">← Retour à la connexion</a></p>
                        </div>

                        <!-- Réinitialisation du mot de passe -->
                        <div class="login-box" id="resetPasswordSection" style="display: none;">
                                <div class="login-box__header">
                                        <span class="login-box__badge">Assistance</span>
                                        <h2 class="title">Définir un nouveau mot de passe</h2>
                                        <p class="login-box__subtitle">Choisissez un mot de passe solide pour sécuriser votre compte.</p>
                                </div>

                                <label class="input-group">
                                        <span class="input-label">Nouveau mot de passe</span>
                                        <input type="password" id="newPass1" name="new_password" class="input-box" placeholder="••••••••" autocomplete="new-password" required>
                                </label>
                                <label class="input-group">
                                        <span class="input-label">Confirmer le mot de passe</span>
                                        <input type="password" id="newPass2" name="confirm_new_password" class="input-box" placeholder="••••••••" autocomplete="new-password" required>
                                </label>

                                <button class="confirm-reset-button">Valider</button>
                                <p id="reset-feedback" class="login-box__feedback" aria-live="polite"></p>
                        </div>

                </div>

                <!-- Partie fixe avec visuel à droite -->
                <div class="login-background" style="background-image: url('/wp-content/themes/customiizer/assets/img/login-modal_bg.webp');" aria-hidden="true">
                        <div class="background-content">
                                <span class="background-badge">L'expérience Customiizer</span>
                                <h2 class="title_login">Donnez vie à vos idées avec Customiizer&nbsp;!</h2>
                                <ul class="background-list">
                                        <li><i class="fas fa-infinity"></i> Créez et personnalisez à l'infini</li>
                                        <li><i class="fas fa-tools"></i> Outils avancés de personnalisation</li>
                                        <li><i class="fas fa-globe"></i> Accessible partout, tout le temps</li>
                                        <li><i class="fas fa-credit-card"></i> Commandez vos créations personnalisées</li>
                                </ul>
                        </div>
                </div>
        </div>
</div>

<!-- Script moved to assets.php -->
