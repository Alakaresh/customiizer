<?php
/*
Template Name: Footer
*/
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

$current_user   = wp_get_current_user();
$user_logged_in = is_user_logged_in();
$user_id        = $current_user->ID;
$user_nicename  = $current_user->user_nicename;
$display_name   = $current_user->display_name;
if ( $user_logged_in ) {
    $profile_image_url = customiizer_get_profile_image_url( $user_id );
    global $wpdb;
    $image_credits = intval( $wpdb->get_var( $wpdb->prepare( "SELECT image_credits FROM WPC_users WHERE user_id = %d", $user_id ) ) );
}
?>
        </div>
        <footer>
                <!-- Blue Band with Centered Links and Right-Aligned Social Icons -->
                <div class="upper-band">
                        <!-- Centered Links -->
                        <div class="footer-links-container">
                                <div class="footer-links">
                                        <a href="/mentions-legales" class="footer-link">Mentions légales</a>
                                        <a href="/conditions" class="footer-link">Conditions générales</a>
                                        <a href="/confidentialite" class="footer-link">Politique de confidentialité</a>
                                        <a href="/retours" class="footer-link">Politique de retour</a>
                                        <a href="/cookies" class="footer-link">Gestion des cookies</a>
                                        <a href="/contact" class="footer-link">Contact</a>
                                </div>
                        </div>

                        <!-- Right-Aligned Social Icons -->
                        <div class="social-icons">
                                <a href="https://instagram.com/customiizer" target="_blank" class="social-icon" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                                <a href="https://tiktok.com/customiizer" target="_blank" class="social-icon" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>
                        </div>
                </div>
                <!-- Lower Black Band for Copyright -->
                <div class="lower-band">
                        <p>Copyright &copy; 2024 Customiizer | Powered by Customiizer</p>
                </div>
        </footer>
        <?php wp_footer(); ?>
        <script>
                document.addEventListener('DOMContentLoaded', function () {
                        const toggle = document.querySelector('.mobile-menu-toggle');
                        const menu = document.querySelector('.mobile-menu');
                        if (toggle && menu) {
                                toggle.addEventListener('click', function () {
                                        const expanded = toggle.getAttribute('aria-expanded') === 'true';
                                        toggle.setAttribute('aria-expanded', (!expanded).toString());
                                        menu.classList.toggle('active');
                                });
                        }
                });
        </script>
<?php if ( $user_logged_in ): ?>
        <script>
                (function(){
                        const essentials = {
                                user_id: <?php echo intval( $user_id ); ?>,
                                display_name: <?php echo json_encode( $display_name ); ?>,
                                image_credits: <?php echo intval( $image_credits ); ?>,
                                user_logo: <?php echo json_encode( $profile_image_url ); ?>
                        };

                        const cachedStr = sessionStorage.getItem("USER_ESSENTIALS");
                        if (cachedStr) {
                                try {
                                        const cached = JSON.parse(cachedStr);
                                        if (cached.user_id === essentials.user_id) {
                                                essentials.image_credits = cached.image_credits;
                                        }
                                } catch(e) {}
                        }

                        sessionStorage.setItem("USER_ESSENTIALS", JSON.stringify(essentials));
                        document.addEventListener("DOMContentLoaded", function(){
                                const creditsEl = document.getElementById("userCredits");
                                if (creditsEl) creditsEl.textContent = essentials.image_credits;
                        });
                })();
        </script>
<?php endif; ?>
<?php if ( is_checkout() ) : ?>
<script>
jQuery(function($){
    $('body').on('click', 'a.showlogin', function(e){
        // Empêche le comportement par défaut du lien
        e.preventDefault();
        // Empêche les autres gestionnaires de clics sur ce lien de s'exécuter
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Ouvre ton modal si la fonction existe
        if (typeof window.openLoginModal === 'function') {
            window.openLoginModal();
        }
        return false;
    });
});
</script>
<?php endif; ?>

        <script>
                jQuery(document).ready(function($) {
                        $('#myCreationsLink, #mobileMyCreationsLink').on('click', function(event) {
                                if (!userIsLoggedIn) {
                                        event.preventDefault();

                                        // Stocke l’intention dans sessionStorage
                                        sessionStorage.setItem("redirectAfterLogin", "myCreations");

                                        $('#loginModal').fadeIn(300);
                                        return false;
                                }
                        });

                });
        </script>
        <script>
                window.addEventListener("load", function () {
                        if (!window.currentUser || !currentUser.ID) {
                                console.warn("⛔️ Aucun utilisateur connecté.");
                                return;
                        }

                        const userId = currentUser.ID;

                        // Références DOM
                        const creditsEl = document.getElementById('userCredits');
                        const nameEl = document.getElementById('userDisplayName');
                        const logoEl = document.getElementById('userLogo');

                        // Vérifie si les éléments existent avant de continuer
                        if (!creditsEl) {
                                console.warn("⚠️ Élément #userCredits introuvable.");
                        } else {
                                const cached = sessionStorage.getItem('USER_ESSENTIALS');
                                let fromCache = false;
                                if (cached) {
                                        const data = JSON.parse(cached);
                                        if (data.user_id === userId) {
                                                creditsEl.textContent = data.image_credits;
                                                if (nameEl) nameEl.textContent = data.display_name;
                                                if (logoEl && data.user_logo) logoEl.src = data.user_logo;
                                                fromCache = true;
                                        }
                                }

                                if (!fromCache) {
                                        // Récupère depuis l’API si pas trouvé dans le cache
                                        fetch(`/wp-json/api/v1/user/load?user_id=${userId}&include=display_name,image_credits,user_logo`, {
                                                credentials: 'include'
                                        })
                                                .then(res => res.json())
                                                .then(data => {
                                                if (data.success && data.data) {
                                                        const essentials = {
                                                                user_id: userId,
                                                                display_name: data.data.display_name,
                                                                image_credits: data.data.image_credits,
                                                                user_logo: data.data.user_logo
                                                        };
                                                        sessionStorage.setItem('USER_ESSENTIALS', JSON.stringify(essentials));

                                                        if (creditsEl) creditsEl.textContent = data.data.image_credits;
                                                        if (nameEl) nameEl.textContent = data.data.display_name;
                                                        if (logoEl && data.data.user_logo) logoEl.src = data.data.user_logo;
                                                }
                                        });
                                }
                        }
                });
        </script>
        </body>
</html>
