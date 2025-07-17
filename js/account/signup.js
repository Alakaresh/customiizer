document.addEventListener('DOMContentLoaded', function() {
        function getCookie(name) {
                const value = '; ' + document.cookie;
                const parts = value.split('; ' + name + '=');
                if (parts.length === 2) return parts.pop().split(';').shift();
                return '';
        }
        const signupForm = document.getElementById('signup');
	const signupButton = signupForm.querySelector('.signup-button');
	const signupNonceInput = document.getElementById('signup-nonce');
	const nonceValue = signupNonceInput.value;

	// Validation du formulaire avant la soumission
	signupButton.addEventListener('click', function(event) {
		event.preventDefault();
		const username = signupForm.querySelector('.input-box[type="text"]').value;
		const email = signupForm.querySelector('.input-box[type="email"]').value;
		const password = signupForm.querySelector('.input-box[type="password"]').value;
		const confirmPassword = signupForm.querySelectorAll('.input-box[type="password"]')[1].value;

		let errors = [];
		if (!email.includes('@')) {
			errors.push("Please enter a valid email address.");
		}
		if (password.length < 8) {
			errors.push("Password must be at least 8 characters long.");
		}
		if (password !== confirmPassword) {
			errors.push("Passwords do not match.");
		}
		if (errors.length > 0) {
			alert(errors.join("\n"));
		} else {
			// Ici, envoyez le formulaire à WordPress si aucune erreur n'est détectée
			// Supposons que nous avons un processus AJAX ou une soumission de formulaire traditionnelle
			processSignup(username, email, password, confirmPassword);
		}
	});
	function processSignup(username, email, password, confirmPassword) {
		console.log("signup");
		const params = new URLSearchParams();
		params.append('action', 'user_signup');
		params.append('username', username);
		params.append('email', email);
		params.append('password', password);
                params.append('confirm_password', confirmPassword);
                const referrer = getCookie('customiizer_referrer');
                if (referrer) {
                        params.append('referrer_id', referrer);
                }
                params.append('registration_nonce', nonceValue);

		fetch(ajaxurl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: params
		})
			.then(response => response.json())
			.then(data => {
                        if (data.success) {
                                console.log("[✅] Inscription réussie");
                                if (data.data && Array.isArray(data.data.missions)) {
                                        data.data.missions.forEach(m => {
                                                if (typeof showMissionToast === 'function') {
                                                        showMissionToast(m);
                                                }
                                        });
                                }

				const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');

				if (redirectAfterLogin === 'myCreations') {
					sessionStorage.removeItem('redirectAfterLogin');
					const targetLink = document.querySelector('#myCreationsLink');
					if (targetLink) {
						window.location.href = targetLink.getAttribute('href');
					} else {
						console.warn("🔁 Lien 'Mes créations' introuvable, fallback sur /compte");
						window.location.href = "/compte";
					}
				} else if (redirectAfterLogin) {
					sessionStorage.removeItem('redirectAfterLogin');
					window.location.href = redirectAfterLogin;
				} else {
					window.location.reload(); // Fallback
				}

			}
			else {
				alert(data.data.message);
			}
		})
			.catch(error => {
			console.error('Error:', error);
			alert('An error occurred. Please try again.');
		});
	}

});