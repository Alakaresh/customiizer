document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('a.ajax-link'); // Assurez-vous que les liens à intercepter ont la classe 'ajax-link'

    links.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Empêche le chargement normal de la page
            const url = this.href;

            fetch(url)
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const content = doc.querySelector('#main-content');
                    document.querySelector('#main-content').innerHTML = content.innerHTML;

                    // Mettre à jour l'URL sans recharger la page
                    history.pushState({path: url}, '', url);
                })
                .catch(error => console.error('Failed to load the page', error));
        });
    });

    // Gérer le bouton retour du navigateur
    window.onpopstate = function(event) {
        if (event.state) {
            document.location = event.state.path;
        }
    };
});
