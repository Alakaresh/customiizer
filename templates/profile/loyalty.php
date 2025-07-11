<?php
// Dedicated page for loyalty advantages
if ( ! defined( 'ABSPATH' ) ) {
    $wp_load = __DIR__ . '/../../../../../wp-load.php';
    if ( file_exists( $wp_load ) ) {
        require_once $wp_load;
    }
}
?>
<div class="content-container" id="loyalty-container">
    <h2>Mes avantages</h2>
    <div class="centered-content">
        <?php customiizer_display_loyalty_balance(); ?>
    </div>
</div>
