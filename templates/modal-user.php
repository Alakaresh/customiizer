<!-- Dropdown utilisateur -->
<div id="userDropdown" class="user-dropdown" style="display:none;">
    <div class="user-header">
        <span class="user-name">
            <?php
            $current_user = wp_get_current_user();
            echo esc_html($current_user->display_name);
            ?>
        </span>
    </div>
    <ul class="user-links">
        <li><a href="<?php echo home_url('/compte'); ?>"><i class="fas fa-id-badge"></i> Mon compte</a></li>
        <li><a href="<?php echo home_url('/communaute'); ?>"><i class="fas fa-users"></i> Communauté</a></li>
        <li><a href="/compte?triggerClick=true"><i class="fas fa-images"></i> Mes créations</a></li>
        <li class="logout">
            <a href="<?php echo wp_logout_url(home_url('/home')); ?>">
                <i class="fas fa-sign-out-alt"></i> Déconnexion
            </a>
        </li>
    </ul>
</div>
