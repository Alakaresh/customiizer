document.addEventListener('DOMContentLoaded', function() {
        const signinForm = document.getElementById('signin');
        if (!signinForm) {
                return;
        }
        const signinButton = signinForm.querySelector('.signin-button');
        const signinNonceInput = document.getElementById('signin-nonce');
        const nonceValue = signinNonceInput.value;

	// Validation du formulaire avant la soumission
	signinButton.addEventListener('click', function(event) {
		event.preventDefault();
		const email = signinForm.querySelector('.input-box[type="email"]').value;
		const password = signinForm.querySelector('.input-box[type="password"]').value;
		const remember = signinForm.querySelector('[name="remember"]').checked;

		let errors = [];

		if (!email.includes('@')) {
			errors.push("Please enter a valid email address.");
		}
		if (errors.length > 0) {
			alert(errors.join("\n"));
		} else {
			// Supposons que nous avons un processus AJAX ou une soumission de formulaire traditionnelle
			processSignin(email, password, remember);
		}
	});
	function processSignin(email, password, remember) {
		const params = new URLSearchParams();
		params.append('action', 'user_signin');
		params.append('email', email);
		params.append('password', password);
		params.append('remember', remember ? '1' : '0');
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
			    // 👉 1) Si on est sur la page checkout, on FORCE un rechargement complet
			    if (document.body.classList.contains('woocommerce-checkout')) {
			      window.location.href =
			        (data.redirect) ||
			        (window.wc_checkout_params && window.wc_checkout_params.checkout_url) ||
			        '/checkout/';
			      return; // important: on stoppe ici
			    }
			
			    // 👉 2) Sinon, on garde ta logique de redirection perso
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
			      return;
			    }
			
			    if (redirectAfterLogin) {
			      sessionStorage.removeItem('redirectAfterLogin');
			      window.location.href = redirectAfterLogin;
			      return;
			    }
			
			    // Fallback : si tu veux faire quelque chose de custom hors checkout
			    if (typeof window.handleAuthSuccess === 'function') {
			      window.handleAuthSuccess();
			    } else {
			      // Page par défaut si rien d'autre n'est prévu
			      window.location.href = "/compte";
			    }
			
			  } else {
			    // Erreur renvoyée par PHP: wp_send_json_error(['message' => '...'])
			    const msg = (data && data.data && data.data.message) ? data.data.message : 'Login failed.';
			    alert(msg);
			  }
			})

			.catch(error => {
			console.error('Error:', error);
			alert('An error occurred. Please try again.\n' + error.message);
		});
	}

});
