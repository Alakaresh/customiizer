<!-- PROFIL UTILISATEUR -->
<div class="profile-containers" id="profile-containers" style="width:100%; height: auto;">
	<div class="details-container" id="details-container">
		<div class="content-container" id="profile-container1">
			<h2>Détails de l'utilisateur</h2>
			<div id="toast-notification" style="display:none;"></div>
			<div class="form-container">
				<form id="user-change-form">
					<div class="form-row">
						<div class="form-group full-width">
							<label for="username">Nom d'utilisateur *</label>
							<input type="text" id="username" name="username" required>
						</div>
					</div>
                                        <div class="form-row">
                                                <div class="form-group full-width">
                                                        <label for="email">Adresse email</label>
                                                        <input type="email" id="email" name="email" required readonly>
                                                </div>
                                        </div>
					<div class="form-row">
						<button type="submit">Mettre à jour</button>
					</div>
				</form>
			</div>
		</div>
	</div>
	<div class="password-container" id="password-container">
		<div class="content-container" id="profile-container2">
			<h2>Changer le mot de passe</h2>
			<div id="password-toast-notification" style="display: none;"></div>
			<div id="password-strength" class="strength-meter"></div>
			<div class="form-container">
				<form id="password-change-form">
					<div class="form-group">
						<label for="current-password">Mot de passe actuel</label>
						<input type="password" id="current-password" name="current-password">
					</div>
					<div class="form-group">
						<label for="new-password">Nouveau mot de passe</label>
						<input type="password" id="new-password" name="new-password">
					</div>
					<div class="form-group">
						<label for="confirm-new-password">Confirmer le nouveau mot de passe</label>
						<input type="password" id="confirm-new-password" name="confirm-new-password">
					</div>
					<input type="hidden" name="password_nonce" value="">
					<div id="password-change-error" style="color: red; display: none;"></div>
					<ul id="password-rules" class="password-rules">
						<li data-rule="length"> Au moins 8 caractères</li>
						<li data-rule="uppercase"> Une majuscule (A-Z)</li>
						<li data-rule="lowercase"> Une minuscule (a-z)</li>
						<li data-rule="number"> Un chiffre (0-9)</li>
						<li data-rule="special"> Un caractère spécial (!@#...)</li>
					</ul>

					<button type="submit">Changer le mot de passe</button>
				</form>
			</div>
		</div>
	</div>
</div>