<!-- sidebar.php -->
<aside class="sidebar account-surface">
        <div class="sidebar-container">
                <div class="account-sidebar__header">
                        <div id="profileContainer" class="profile-picture" role="button" tabindex="0" aria-label="<?php esc_attr_e( 'Modifier la photo de profil', 'customiizer' ); ?>" onclick="showElement('modalChoixImage');" onkeypress="if(event.key === 'Enter'){ showElement('modalChoixImage'); }">
                                <div class="circle-plus" id="circlePlus">
                                        <div class="plus-vertical"></div>
                                        <div class="plus-horizontal"></div>
                                </div>
                                <img id="profileImage" src="" alt="<?php esc_attr_e( 'Photo de profil', 'customiizer' ); ?>" style="display: none;" />
                        </div>
                        <div class="user-info">
                                <span class="user-info__eyebrow"><?php esc_html_e( 'Profil Customiizer', 'customiizer' ); ?></span>
                                <p class="user-info__name"><span id="nickname"></span></p>
                                <p class="user-info__status"><?php esc_html_e( 'Personnalise ton espace et retrouve toutes tes activités.', 'customiizer' ); ?></p>
                        </div>
                </div>

                <div class="account-sidebar__body">
                        <nav class="navigation-menu" aria-label="<?php esc_attr_e( 'Sections du compte', 'customiizer' ); ?>">
                                <span class="navigation-menu__title"><?php esc_html_e( 'Navigation', 'customiizer' ); ?></span>
                                <a href="javascript:void(0);" id="dashboardLink" class="ajax-link" data-target="dashboard">
                                        <i class="fas fa-chart-pie" aria-hidden="true"></i>
                                        <span><?php esc_html_e( 'Tableau de bord', 'customiizer' ); ?></span>
                                </a>
                                <a href="javascript:void(0);" id="picturesLink" class="ajax-link" data-target="pictures">
                                        <i class="fas fa-image" aria-hidden="true"></i>
                                        <span><?php esc_html_e( 'Images', 'customiizer' ); ?></span>
                                </a>
                                <a href="javascript:void(0);" id="accountLink" class="ajax-link" data-target="profile">
                                        <i class="fas fa-user-cog" aria-hidden="true"></i>
                                        <span><?php esc_html_e( 'Profil', 'customiizer' ); ?></span>
                                </a>
                                <a href="javascript:void(0);" id="purchasesLink" class="ajax-link" data-target="purchases">
                                        <i class="fas fa-receipt" aria-hidden="true"></i>
                                        <span><?php esc_html_e( 'Commandes', 'customiizer' ); ?></span>
                                </a>
                                <a href="javascript:void(0);" id="loyaltyLink" class="ajax-link" data-target="loyalty">
                                        <i class="fas fa-gift" aria-hidden="true"></i>
                                        <span><?php esc_html_e( 'Mes avantages', 'customiizer' ); ?></span>
                                </a>
                                <a href="javascript:void(0);" id="missionsLink" class="ajax-link" data-target="missions">
                                        <i class="fas fa-flag-checkered" aria-hidden="true"></i>
                                        <span><?php esc_html_e( 'Missions', 'customiizer' ); ?></span>
                                </a>
                        </nav>

                        <div class="account-sidebar__callout" aria-live="polite">
                                <i class="fas fa-lightbulb" aria-hidden="true"></i>
                                <p><?php esc_html_e( 'Astuce : complète ton profil pour débloquer davantage de missions et d’avantages.', 'customiizer' ); ?></p>
                        </div>
                </div>

                <div class="account-sidebar__footer">
                        <a href="<?php echo esc_url( wp_logout_url( home_url( '/home' ) ) ); ?>" class="logout-button">
                                <i class="fas fa-sign-out-alt" aria-hidden="true"></i>
                                <span><?php esc_html_e( 'Déconnexion', 'customiizer' ); ?></span>
                        </a>
                </div>
        </div>

        <!-- MODAL CHOIX IMAGE -->
        <div id="modalChoixImage" class="modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="modalChoixImageTitle">
                <div class="modal-header">
                        <button type="button" class="close-btn" onclick="hideElement('modalChoixImage');" aria-label="<?php esc_attr_e( 'Fermer', 'customiizer' ); ?>">&#215;</button>
                        <h2 id="modalChoixImageTitle"><?php esc_html_e( 'Choisir une image', 'customiizer' ); ?></h2>
                </div>
                <div class="modal-body">
                        <div id="imagePreview" class="image-placeholder">
                                <img id="imageToCrop" style="display:none;" alt="<?php esc_attr_e( 'Prévisualisation de l\'image', 'customiizer' ); ?>">
                        </div>
                </div>
                <div class="modal-footer">
                        <div class="top-buttons">
                                <button type="button" onclick="document.getElementById('fileInput').click();">
                                        <i class="fas fa-upload" aria-hidden="true"></i>
                                        <span><?php esc_html_e( 'Ordinateur', 'customiizer' ); ?></span>
                                </button>
                                <input type="file" id="fileInput" accept="image/*" style="display: none;" onchange="handleImageUpload(event)">
                                <button type="button" onclick="afficherGalerie();">
                                        <i class="fas fa-images" aria-hidden="true"></i>
                                        <span><?php esc_html_e( 'Mes créations', 'customiizer' ); ?></span>
                                </button>
                        </div>
                        <div class="bottom-button">
                                <button type="button" onclick="applyCrop();">
                                        <i class="fas fa-check" aria-hidden="true"></i>
                                        <span><?php esc_html_e( 'Appliquer', 'customiizer' ); ?></span>
                                </button>
                        </div>
                </div>
        </div>
</aside>

<script>
        var baseTemplateUrl = "<?php echo get_stylesheet_directory_uri(); ?>/templates/profile/";
</script>
