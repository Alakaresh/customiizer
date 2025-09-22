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
                <!-- Bande accentuée avec liens centrés et icônes sociales alignées à droite -->
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
                        <p>© 2025 Customiizer | Développé par Customiizer</p>
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
                        if (window.currentUser && currentUser.ID === essentials.user_id) {
                                currentUser.image_credits = essentials.image_credits;
                                currentUser.display_name = essentials.display_name;
                        }
                })();
        </script>
<?php endif; ?>
        <script>
                window.addEventListener("load", function () {
                        if (!window.currentUser || !currentUser.ID) {
                                console.warn("⛔️ Aucun utilisateur connecté.");
                                return;
                        }

                        const userId = currentUser.ID;

                        let shouldFetch = true;
                        try {
                                const cached = sessionStorage.getItem('USER_ESSENTIALS');
                                if (cached) {
                                        const data = JSON.parse(cached);
                                        if (data.user_id === userId && typeof data.image_credits !== 'undefined') {
                                                shouldFetch = false;
                                                if (window.currentUser && currentUser.ID === userId) {
                                                        currentUser.image_credits = data.image_credits;
                                                        currentUser.display_name = data.display_name;
                                                }
                                        }
                                }
                        } catch (error) {
                                console.warn('⚠️ Impossible de lire USER_ESSENTIALS.', error);
                        }

                        if (!shouldFetch) {
                                return;
                        }

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

                                        if (window.currentUser && currentUser.ID === userId) {
                                                currentUser.display_name = data.data.display_name;
                                                currentUser.image_credits = data.data.image_credits;
                                        }
                                }
                        })
                                .catch(error => {
                                console.error('❌ Erreur lors de la récupération des informations utilisateur :', error);
                        });
                });
        </script>
        </body>
</html>
