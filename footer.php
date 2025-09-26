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
        <footer id="site-footer" class="site-footer">
                <div class="upper-band">
                        <div class="upper-band__inner">
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
                        </div>
                </div>
                <div class="lower-band">
                        <div class="lower-band__inner">
                                <p>© 2025 Customiizer | Développé par Customiizer</p>
                        </div>
                </div>
        </footer>
        <div id="generation-tracker-modal" class="generation-tracker">
                <div class="generation-tracker__content">
                        <div class="generation-tracker__header">
                                <span class="generation-tracker__title">Génération en cours</span>
                                <span class="generation-tracker__status-badge" data-generation-status-badge>EN COURS</span>
                        </div>
                        <div class="generation-tracker__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100">
                                <div class="generation-tracker__progress-bar" data-generation-progress-bar aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>
                                <span class="generation-tracker__progress-value" data-generation-progress-value>0%</span>
                        </div>
                        <p class="generation-tracker__status" data-generation-status>Préparation de votre image...</p>
                        <div class="generation-tracker__prompt is-hidden" data-generation-prompt-wrapper>
                                <span class="generation-tracker__prompt-label">Prompt&nbsp;:</span>
                                <span class="generation-tracker__prompt-value" data-generation-prompt></span>
                        </div>
                        <div class="generation-tracker__preview is-hidden" data-generation-preview>
                                <img src="" alt="" loading="lazy" />
                        </div>
                </div>
        </div>
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
                                                if (!essentials.display_name && cached.display_name) {
                                                        essentials.display_name = cached.display_name;
                                                }
                                                if (!essentials.user_logo && cached.user_logo) {
                                                        essentials.user_logo = cached.user_logo;
                                                }
                                        }
                                } catch (error) {
                                        console.warn('Impossible de relire USER_ESSENTIALS depuis le cache', error);
                                }
                        }

                        sessionStorage.setItem("USER_ESSENTIALS", JSON.stringify(essentials));
                        document.addEventListener("DOMContentLoaded", function(){
                                const creditsEl = document.getElementById("userCredits");
                                if (creditsEl) creditsEl.textContent = essentials.image_credits;
                        });
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

                        // Références DOM
                        const creditsEl = document.getElementById('userCredits');
                        const nameEl = document.getElementById('userDisplayName');
                        const logoEl = document.getElementById('userLogo');

                        if (!creditsEl) {
                                console.warn("⚠️ Élément #userCredits introuvable.");
                        }

                        const renderEssentials = (data) => {
                                if (!data || data.user_id !== userId) {
                                        return;
                                }

                                if (creditsEl && typeof data.image_credits !== 'undefined') {
                                        creditsEl.textContent = data.image_credits;
                                }
                                if (nameEl) {
                                        nameEl.textContent = data.display_name || '';
                                }
                                if (logoEl) {
                                        if (data.user_logo) {
                                                logoEl.src = data.user_logo;
                                        }
                                }
                        };

                        const cached = sessionStorage.getItem('USER_ESSENTIALS');
                        if (cached) {
                                try {
                                        const data = JSON.parse(cached);
                                        renderEssentials(data);
                                } catch (error) {
                                        console.warn('Impossible de parser USER_ESSENTIALS depuis le cache', error);
                                }
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
                                                renderEssentials(essentials);
                                        }
                                })
                                .catch(error => {
                                        console.error('Erreur lors du rafraîchissement des informations utilisateur', error);
                                });
                });
        </script>
        </body>
</html>
