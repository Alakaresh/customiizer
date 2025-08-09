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
          const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');
          if (redirectAfterLogin === 'myCreations') {
            sessionStorage.removeItem('redirectAfterLogin');
            const targetLink = document.querySelector('#myCreationsLink');
            if (targetLink) {
              window.location.href = targetLink.getAttribute('href');
            } else {
              window.location.href = '/compte';
            }
          } else if (redirectAfterLogin) {
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectAfterLogin;
          } else if (typeof window.handleAuthSuccess === 'function') {
            window.handleAuthSuccess();
          }
        }else{
          alert(data.data.message || 'Google login failed');
        }
      }).catch(err=>{
        console.error('Google login error', err);
        alert('Google login failed');

      });
    }
    function missingIdAlert(e){
      e.preventDefault();
      alert('Google login is not configured.');
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

