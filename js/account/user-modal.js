document.addEventListener('DOMContentLoaded', function() {

    if (userIsLoggedIn) {
        const profileLink = document.getElementById('profileLink');
        const userModal = document.getElementById('userModal');
        let openedByClick = false;  // Track if opened by click
        let mouseInModal = false;   // Track if the mouse is inside the modal

        // Open modal on mouseover
        profileLink.addEventListener('mouseover', function() {
            userModal.style.display = 'block';
            openedByClick = false;
        });

        // Open modal on click
        profileLink.addEventListener('click', function(event) {
            event.preventDefault();
            userModal.style.display = 'block';
            openedByClick = true;
        });

        // Track if the mouse is over the modal
        userModal.addEventListener('mouseenter', function() {
            mouseInModal = true;
        });

        // Track if the mouse leaves the modal
        userModal.addEventListener('mouseleave', function() {
            mouseInModal = false;
            if (!openedByClick) {
                userModal.style.display = 'none';
            }
        });

        // Close modal if the mouse leaves the link and the mouse is not over the modal
        profileLink.addEventListener('mouseleave', function() {
            if (!openedByClick && !mouseInModal) {
                setTimeout(() => {
                    if (!openedByClick && !mouseInModal) {
                        userModal.style.display = 'none';
                    }
                }, 500); // Delay before closing
            }
        });

        // Close the modal if the user clicks outside the modal content
        window.addEventListener('click', function(event) {
            if (!userModal.contains(event.target) && !profileLink.contains(event.target)) {
                userModal.style.display = 'none';
                openedByClick = false;
            }
        });
    }
});
