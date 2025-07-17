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
    <div class="loyalty-info">
        <h3><?php echo esc_html__( 'Comment gagner des points', 'customiizer' ); ?></h3>
        <ul class="loyalty-explain-list">
            <li><?php echo esc_html__( '5 points sont crédités pour chaque euro dépensé hors taxes.', 'customiizer' ); ?></li>
            <li><?php echo esc_html__( 'Les points sont ajoutés lorsque votre commande passe au statut \'terminée\'.', 'customiizer' ); ?></li>
            <li><?php echo esc_html__( 'Accomplissez des missions pour obtenir les récompenses indiquées.', 'customiizer' ); ?></li>
            <li><?php echo esc_html__( 'Parrainez vos amis et gagnez 500 points chacun pour chaque inscription validée.', 'customiizer' ); ?></li>
        </ul>
        <h3><?php echo esc_html__( 'Comment utiliser mes points', 'customiizer' ); ?></h3>
        <ul class="loyalty-explain-list">
            <li><?php echo esc_html__( 'Au panier ou à la caisse, cliquez sur "Utiliser mes points".', 'customiizer' ); ?></li>
            <li><?php echo esc_html__( 'Saisissez le nombre de points à déduire (100 points = 1€).', 'customiizer' ); ?></li>
            <li><?php echo esc_html__( 'La réduction s\'applique immédiatement sur le total hors taxes.', 'customiizer' ); ?></li>
            <li><?php echo esc_html__( 'Votre solde restant est toujours visible dans votre espace client.', 'customiizer' ); ?></li>
        </ul>
    </div>
</div>
