document.addEventListener('DOMContentLoaded', function() {
	const loginBox = document.getElementById('signin');
	const signupOptions = document.getElementById('signupOptions');
	const emailSignupBox = document.getElementById('signup');
	const showSignup = document.getElementById('showSignup');
	const showEmailSignup = document.getElementById('showEmailSignup');
	const showLogin = document.getElementById('showLogin');
	const closeModalButtons = document.querySelectorAll('.close');
	const socialButtons = document.querySelectorAll('.social-button');

        socialButtons.forEach(button => {
                if (button.classList.contains('google')) return;
                button.addEventListener('click', function(e) {
                        e.preventDefault();  // Empêche toute action par défaut (comme la soumission d'un formulaire)
                        alert("This feature is not yet active.");  // Affiche une alerte
                });
        });

	function switchView(view) {
		// Hide all views
		loginBox.style.display = 'none';
		signupOptions.style.display = 'none';
		emailSignupBox.style.display = 'none';

		// Show the requested view
		view.style.display = 'block';
	}

	showSignup.addEventListener('click', function() {
		switchView(signupOptions);
	});

	showEmailSignup.addEventListener('click', function() {
		switchView(emailSignupBox);
	});

	showLogin.addEventListener('click', function() {
		switchView(loginBox);
	});

	closeModalButtons.forEach(button => {
		button.addEventListener('click', function() {
			document.getElementById('loginModal').style.display = 'none';
		});
	});
	
});
document.getElementById('showForgotPassword').addEventListener('click', function (e) {
	e.preventDefault();
	document.getElementById('signin').style.display = 'none';
	document.getElementById('forgotPassword').style.display = 'block';
});

document.getElementById('backToLogin').addEventListener('click', function (e) {
	e.preventDefault();
	document.getElementById('forgotPassword').style.display = 'none';
	document.getElementById('signin').style.display = 'block';
});
document.querySelector('.reset-password-button').addEventListener('click', function () {
	const email = document.getElementById('reset-email').value;
	if (!email.includes('@')) {
		alert("Veuillez entrer une adresse e-mail valide.");
		return;
	}

	const params = new URLSearchParams();
	params.append('action', 'reset_password_request');
	params.append('email', email);

	fetch(ajaxurl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: params
	})
	.then(res => res.json())
	.then(data => {
		if (data.success) {
			alert("📧 Un lien de réinitialisation vous a été envoyé !");
			document.getElementById('forgotPassword').style.display = 'none';
			document.getElementById('signin').style.display = 'block';
		} else {
			alert("⚠️ " + data.data.message);
		}
	})
	.catch(err => {
		console.error(err);
		alert("Une erreur s’est produite.");
	});
});
document.addEventListener("DOMContentLoaded", function() {
	const loginRegisterButton = document.getElementById('loginRegisterButton');

	// Vérifier si le bouton existe dans le DOM avant d'ajouter l'écouteur
	if (loginRegisterButton) {
		loginRegisterButton.addEventListener('click', function() {
			if (!userIsLoggedIn) {  // S'exécute seulement si l'utilisateur n'est pas connecté
				openLoginModal();  // Fonction pour ouvrir le modal de connexion
			}
		});
	}
});
document.addEventListener('DOMContentLoaded', function () {
	const params = new URLSearchParams(window.location.search);
	const key = params.get('reset_key');
	const login = params.get('login');

	if (key && login) {
		document.getElementById('loginModal').style.display = 'flex';
		document.getElementById('signin').style.display = 'none';
		document.getElementById('resetPasswordSection').style.display = 'block';

		document.querySelector('.confirm-reset-button').addEventListener('click', function () {
			const pass1 = document.getElementById('newPass1').value;
			const pass2 = document.getElementById('newPass2').value;

			if (pass1 !== pass2) {
				document.getElementById('reset-feedback').innerText = "❌ Les mots de passe ne correspondent pas.";
				return;
			}

			const form = new URLSearchParams();
			form.append('action', 'custom_update_password');
			form.append('key', key);
			form.append('login', login);
			form.append('pass1', pass1);
			form.append('pass2', pass2);

			fetch(ajaxurl, {
				method: 'POST',
				body: form
			})
			.then(res => res.json())
			.then(data => {
				document.getElementById('reset-feedback').innerText = data.data.message;
				if (data.success) {
					setTimeout(() => {
						window.location.href = window.location.origin; // ou une page de confirmation
					}, 2000);
				}
			});
		});
	}
});

function openLoginModal() {
        const modal = document.getElementById('loginModal');
        modal.style.display = 'flex';
}

function handleAuthSuccess() {
        userIsLoggedIn = true;
        const modal = document.getElementById('loginModal');
        if (modal) modal.style.display = 'none';
}

// Expose to other scripts
window.openLoginModal = openLoginModal;
window.handleAuthSuccess = handleAuthSuccess;
