(function(){
  document.addEventListener('DOMContentLoaded', function(){
    const loginBtn = document.getElementById('googleLoginBtn');
    const signupBtn = document.getElementById('googleSignupBtn');
    function handleCredential(response){
      const params = new URLSearchParams();
      params.append('action','google_login');
      params.append('id_token', response.credential);
      fetch(googleLogin.ajaxUrl, {
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:params
      }).then(r=>r.json()).then(data=>{
        if(data.success){
          window.location.reload();
        }else{
          alert(data.data.message || 'La connexion Google a échoué.');
        }
      }).catch(err=>{
        console.error('Google login error', err);
        alert('La connexion Google a échoué.');

      });
    }
    function missingIdAlert(e){
      e.preventDefault();
      alert("La connexion Google n'est pas configurée.");
    }
    function init(){
      if(!googleLogin.clientId){
        if(loginBtn) loginBtn.addEventListener('click', missingIdAlert);
        if(signupBtn) signupBtn.addEventListener('click', missingIdAlert);
        return;
      }

      google.accounts.id.initialize({
        client_id: googleLogin.clientId,
        callback: handleCredential,
        ux_mode: 'popup'
      });
      if(loginBtn){
        loginBtn.addEventListener('click', function(e){
          e.preventDefault();
          google.accounts.id.prompt();
        });
      }
      if(signupBtn){
        signupBtn.addEventListener('click', function(e){
          e.preventDefault();
          google.accounts.id.prompt();
        });
      }
    }
    if(window.google && google.accounts){
      init();
    }else{
      window.onGoogleLibraryLoad = init;
    }
  });
})();

