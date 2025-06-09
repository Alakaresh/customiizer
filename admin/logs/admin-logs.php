<?php
add_action('admin_menu', function () {
    add_menu_page(
        'Logs Customiizer',
        '🧾 Logs',
        'manage_options',
        'customiizer-logs',
        'customiizer_render_logs_page',
        'dashicons-list-view',
        3
    );
});

function customiizer_render_logs_page() {
    echo '<div class="wrap"><h1>🧾 Logs – Send Order</h1>';
    include __DIR__ . '/modules/section-send_order.php';
    echo '</div>';
}
