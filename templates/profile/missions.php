<?php
// Dedicated page for missions and achievements
if ( ! defined( 'ABSPATH' ) ) {
    $wp_load = __DIR__ . '/../../../../../wp-load.php';
    if ( file_exists( $wp_load ) ) {
        require_once $wp_load;
    }
}
?>
<div class="content-container" id="missions-container">
    <h2>Missions</h2>
    <?php if ( is_user_logged_in() ) : ?>
        <p class="total-mission-points">
            <?php echo esc_html( sprintf( __( 'Total de points gagnés : %d', 'customiizer' ), customiizer_get_total_earned_points() ) ); ?>
        </p>
    <?php endif; ?>
    <div class="missions-wrapper">
        <div id="mission-categories"></div>
        <div id="missions-list" class="missions-list"></div>
    </div>
</div>
