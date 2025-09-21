<?php
$is_user_logged_in = is_user_logged_in();
$current_user      = wp_get_current_user();
$display_name      = $current_user->display_name;
$user_email        = $current_user->user_email;
$user_id           = $current_user->ID;

$profile_image_url = function_exists( 'customiizer_get_profile_image_url' )
        ? customiizer_get_profile_image_url( $user_id )
        : '';

$name_initial = '';

if ( ! empty( $display_name ) ) {
        if ( function_exists( 'mb_substr' ) ) {
                $name_initial = mb_substr( $display_name, 0, 1, 'UTF-8' );
        } else {
                $name_initial = substr( $display_name, 0, 1 );
        }
} elseif ( ! empty( $current_user->user_login ) ) {
        if ( function_exists( 'mb_substr' ) ) {
                $name_initial = mb_substr( $current_user->user_login, 0, 1, 'UTF-8' );
        } else {
                $name_initial = substr( $current_user->user_login, 0, 1 );
        }
}

$name_initial = strtoupper( $name_initial );

$dropdown_aria_labelledby = $is_user_logged_in ? ' aria-labelledby="profileLink"' : '';
?>

<!-- Dropdown utilisateur -->
<div id="userDropdown" class="user-dropdown" aria-hidden="true" hidden<?php echo $dropdown_aria_labelledby; ?>>
        <div class="user-dropdown__inner">
                <div class="user-dropdown__header">
                        <div class="user-dropdown__avatar" aria-hidden="true">
                                <?php if ( ! empty( $profile_image_url ) ) : ?>
                                        <img src="<?php echo esc_url( $profile_image_url ); ?>" alt="" class="user-dropdown__avatar-image">
                                <?php elseif ( ! empty( $name_initial ) ) : ?>
                                        <span class="user-dropdown__avatar-initial"><?php echo esc_html( $name_initial ); ?></span>
                                <?php else : ?>
                                        <i class="fas fa-user"></i>
                                <?php endif; ?>
                        </div>
                        <div class="user-dropdown__identity">
                                <?php if ( ! empty( $display_name ) ) : ?>
                                        <span class="user-dropdown__name"><?php echo esc_html( $display_name ); ?></span>
                                <?php endif; ?>
                                <?php if ( ! empty( $user_email ) ) : ?>
                                        <span class="user-dropdown__email"><?php echo esc_html( $user_email ); ?></span>
                                <?php endif; ?>
                        </div>
                </div>
                <ul class="user-dropdown__links" role="menu" aria-orientation="vertical">
                        <li role="none">
                                <a class="user-dropdown__link" href="<?php echo esc_url( home_url( '/compte' ) ); ?>" role="menuitem">
                                        <span class="user-dropdown__icon" aria-hidden="true"><i class="fas fa-id-badge"></i></span>
                                        <span class="user-dropdown__label">Mon compte</span>
                                </a>
                        </li>
                        <li role="none">
                                <a class="user-dropdown__link" href="<?php echo esc_url( home_url( '/communaute' ) ); ?>" role="menuitem">
                                        <span class="user-dropdown__icon" aria-hidden="true"><i class="fas fa-users"></i></span>
                                        <span class="user-dropdown__label">Communauté</span>
                                </a>
                        </li>
                        <li role="none">
                                <a class="user-dropdown__link" href="<?php echo esc_url( home_url( '/compte?triggerClick=true' ) ); ?>" role="menuitem">
                                        <span class="user-dropdown__icon" aria-hidden="true"><i class="fas fa-images"></i></span>
                                        <span class="user-dropdown__label">Mes créations</span>
                                </a>
                        </li>
                        <li role="none">
                                <a class="user-dropdown__link user-dropdown__link--logout" href="<?php echo esc_url( wp_logout_url( home_url( '/home' ) ) ); ?>" role="menuitem">
                                        <span class="user-dropdown__icon" aria-hidden="true"><i class="fas fa-sign-out-alt"></i></span>
                                        <span class="user-dropdown__label">Déconnexion</span>
                                </a>
                        </li>
                </ul>
        </div>
</div>
