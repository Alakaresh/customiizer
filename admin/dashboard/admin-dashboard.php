<?php
add_action('admin_menu', function () {
    add_menu_page(
        'Customiizer Admin',
        'Dashboard',
        'manage_options',
        'customiizer-dashboard',
        'customiizer_render_admin_dashboard',
        'dashicons-admin-tools',
        3
    );
});

function customiizer_render_admin_dashboard() {
    echo '<div class="wrap">';
    echo '<h1>🧭 Customiizer - Tableau de bord</h1>';
	
	include __DIR__ . '/modules/section-queue.php';
	include __DIR__ . '/modules/section-printful.php';
	include __DIR__ . '/modules/section-monitoring.php';
    
    echo '</div>';
}

