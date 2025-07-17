function initProfileForm() {
	const form = document.getElementById('user-change-form');

	if (!form) {
		console.warn("⚠️ Formulaire utilisateur introuvable !");
		return;
	}

	if (form.dataset.initialized === "true") {
		console.log("🔁 Formulaire déjà initialisé.");
		return;
	}

	form.dataset.initialized = "true";
	console.log("🟢 Submit form initialisé.");

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		e.stopPropagation();

		const displayName = document.getElementById('username').value.trim();
		if (!displayName) {
			alert("❌ Le nom d'utilisateur ne peut pas être vide.");
			return;
		}

		const formData = new URLSearchParams();
		formData.append('action', 'update_user_details');
		formData.append('display_name', displayName);

		fetch(ajaxurl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: formData
		})
			.then(res => res.json())
			.then(data => {
			console.log("🧾 Réponse serveur :", data);
                        if (data.success) {
                                showToast("toast-notification", "✅ Profil mis à jour avec succès.");
                                const nicknameSpan = document.getElementById('nickname');
                                if (nicknameSpan) {
                                        nicknameSpan.textContent = displayName;
                                }
                                const modalName = document.querySelector('#userModal .user-name');
                                if (modalName) {
                                        modalName.textContent = displayName;
                                }
                                if (typeof updateUsernameProgress === 'function') {
                                        updateUsernameProgress(displayName);
                                }

			} else {
				showToast("toast-notification", "❌ Ce nom d’utilisateur est déjà utilisé.", false);
			}
		})
			.catch(err => {
			console.error("❌ Erreur AJAX : ", err);
			alert("❌ Problème technique.");
		});
	});
}
function showToast(toastId, message, success = true) {
	const toast = document.getElementById(toastId);
	if (!toast) return;

	toast.textContent = message;
	toast.style.backgroundColor = success ? '#28a745' : '#dc3545';
	toast.style.display = 'block';
	toast.classList.add('show');

	setTimeout(() => {
		toast.classList.remove('show');
		toast.style.display = 'none';
		toast.textContent = "";
	}, 3000);
}

function initPasswordForm() {
	const passwordForm = document.getElementById('password-change-form');
	if (!passwordForm || passwordForm.dataset.initialized === "true") return;

	passwordForm.dataset.initialized = "true";

	const newPasswordInput = document.getElementById('new-password');
	const strengthMeter = document.getElementById('password-strength');

	// 🔁 Analyse dynamique du mot de passe
	if (newPasswordInput && strengthMeter) {
		newPasswordInput.addEventListener('input', function () {
			const password = this.value;
			let strength = 0;

			if (password.length >= 8) strength++;
			if (/[A-Z]/.test(password)) strength++;
			if (/[a-z]/.test(password)) strength++;
			if (/[0-9]/.test(password)) strength++;
			if (/[\W_]/.test(password)) strength++;

			strengthMeter.style.display = 'block';
			strengthMeter.className = 'strength-meter';


			if (password.length === 0) {
				strengthMeter.textContent = '';
				strengthMeter.style.display = 'none';
				return;
			}


			if (strength <= 2) {
				strengthMeter.classList.add('strength-weak');
				strengthMeter.textContent = 'Faible';
			} else if (strength <= 4) {
				strengthMeter.classList.add('strength-medium');
				strengthMeter.textContent = 'Moyen';
			} else {
				strengthMeter.classList.add('strength-strong');
				strengthMeter.textContent = 'Fort';
			}
			const rulesList = document.getElementById('password-rules');
			if (newPasswordInput && rulesList) {
				newPasswordInput.addEventListener('input', function () {
					const val = this.value;

					const rules = {
						length: val.length >= 8,
						uppercase: /[A-Z]/.test(val),
						lowercase: /[a-z]/.test(val),
						number: /[0-9]/.test(val),
						special: /[\W_]/.test(val),
					};

					for (const rule in rules) {
						const li = rulesList.querySelector(`li[data-rule="${rule}"]`);
						if (li) {
							li.classList.remove('valid', 'invalid');
							li.classList.add(rules[rule] ? 'valid' : 'invalid');
						}
					}
				});
			}

		});
	}

	// 🔐 Gestion du submit
	passwordForm.addEventListener('submit', function (e) {
		e.preventDefault();

		const currentPassword = document.getElementById('current-password').value.trim();
		const newPassword = document.getElementById('new-password').value.trim();
		const confirmNewPassword = document.getElementById('confirm-new-password').value.trim();
		const nonce = passwordForm.querySelector('input[name="password_nonce"]').value;

		if (!currentPassword || !newPassword || !confirmNewPassword) {
			showToast("password-toast-notification", "❌ Tous les champs sont requis.", false);
			return;
		}

		if (newPassword !== confirmNewPassword) {
			showToast("password-toast-notification", "❌ Les mots de passe ne correspondent pas.", false);
			return;
		}

		if (strengthMeter && strengthMeter.textContent === 'Faible') {
			showToast("password-toast-notification", "❌ Le mot de passe est trop faible.", false);
			return;
		}

		const formData = new URLSearchParams();
		formData.append('action', 'change_user_password');
		formData.append('current_password', currentPassword);
		formData.append('new_password', newPassword);
		formData.append('confirm_new_password', confirmNewPassword);
		formData.append('password_nonce', nonce);

		fetch(ajaxurl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: formData
		})
			.then(res => res.json())
			.then(data => {
			if (data.success) {
				showToast("password-toast-notification", "✅ Mot de passe mis à jour.");
				passwordForm.reset();
				if (strengthMeter) {
					strengthMeter.className = 'strength-meter';
					strengthMeter.textContent = '';
					strengthMeter.style.display = 'none';
				}

			} else {
				showToast("password-toast-notification", "❌ " + (data.data || "Erreur inconnue."), false);
			}
		})
			.catch(error => {
			console.error("❌ Erreur AJAX :", error);
			showToast("password-toast-notification", "❌ Problème technique.", false);
		});
	});
}


// Fonction pour remplir les champs à partir de l'API
function loadUserDetails() {
        const cachedStr = sessionStorage.getItem('USER_DETAILS');
        if (cachedStr) {
                try {
                        const cached = JSON.parse(cachedStr);
                        if (cached.display_name) $('#username').val(cached.display_name);
                        if (cached.email) $('#email').val(cached.email);
                        if (cached.password_nonce) {
                                $('#password-change-form').find('input[name="password_nonce"]').val(cached.password_nonce);
                        }
                        return;
                } catch (e) {
                        console.warn('Cache parse error for user details', e);
                }
        }

        $.ajax({
                url: ajaxurl,
                data: { action: 'get_user_details' },
                type: 'POST',
                dataType: 'json',
                success: function (response) {
                        if (response.success) {
                                sessionStorage.setItem('USER_DETAILS', JSON.stringify(response.data));
                                if (response.data.display_name) $('#username').val(response.data.display_name);
                                if (response.data.email) $('#email').val(response.data.email);
                                $('#password-change-form').find('input[name="password_nonce"]').val(response.data.password_nonce);
                        } else {
                                alert('❌ Impossible de charger les infos utilisateur.');
                        }
                }
        });
}

// Petit message de confirmation temporaire
function showSuccessMessage(formId, message) {
	const form = document.querySelector(formId);
	const msg = document.createElement('div');
	msg.className = 'success-message';
	msg.textContent = message;
	form.prepend(msg);
	setTimeout(() => msg.remove(), 3000);
}