document.addEventListener('DOMContentLoaded', function() {
    if (typeof userIsLoggedIn !== "undefined" && userIsLoggedIn) {
        const profileLink = document.getElementById('profileLink');
        const userDropdown = document.getElementById('userDropdown');
        let openedByClick = false;
        let mouseInDropdown = false;

        // Ouvrir au survol
        profileLink.addEventListener('mouseover', function() {
            userDropdown.style.display = 'block';
            openedByClick = false;
        });

        // Ouvrir au clic
        profileLink.addEventListener('click', function(event) {
            event.preventDefault();
            userDropdown.style.display = 'block';
            openedByClick = true;
        });

        // Survol dans le dropdown
        userDropdown.addEventListener('mouseenter', function() {
            mouseInDropdown = true;
        });

        // Quitte le dropdown
        userDropdown.addEventListener('mouseleave', function() {
            mouseInDropdown = false;
            if (!openedByClick) {
                userDropdown.style.display = 'none';
            }
        });

        // Quitte le bouton profil
        profileLink.addEventListener('mouseleave', function() {
            if (!openedByClick && !mouseInDropdown) {
                setTimeout(() => {
                    if (!openedByClick && !mouseInDropdown) {
                        userDropdown.style.display = 'none';
                    }
                }, 400);
            }
        });

        // Fermer si clic en dehors
        window.addEventListener('click', function(event) {
            if (!userDropdown.contains(event.target) && !profileLink.contains(event.target)) {
                userDropdown.style.display = 'none';
                openedByClick = false;
            }
        });
    }
});
