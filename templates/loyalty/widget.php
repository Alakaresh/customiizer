<?php
if ( ! defined( 'ABSPATH' ) ) {
    $wp_load = __DIR__ . '/../../../../../wp-load.php';
    if ( file_exists( $wp_load ) ) {
        require_once $wp_load;
    }
}
?>
<div id="loyalty-widget-popup">
    <header id="loyalty-widget-header">
        <button id="loyalty-widget-back" class="loyalty-back-main" aria-label="Retour" style="display:none;"><i class="fas fa-arrow-left"></i></button>
        <span class="loyalty-widget-title">
            <img class="loyalty-widget-icon" src="<?php echo esc_url( get_stylesheet_directory_uri() . '/images/customiizerSiteImages/customPoint.png' ); ?>" alt="Custompoints" />
            <span class="loyalty-widget-title-text"><?php echo esc_html__( 'Mes custompoints', 'customiizer' ); ?></span>
        </span>
        <span class="loyalty-widget-points"><?php echo intval( $points ); ?> pts</span>
        <button id="loyalty-widget-close" aria-label="Fermer">&times;</button>
    </header>

    <div id="loyalty-widget-content">
        <?php if ( $logged_in ) : ?>
            <div class="loyalty-widget-page loyalty-page-main">
                <div class="loyalty-widget-card">
                    <button class="loyalty-action loyalty-how-get">
                        <i class="fas fa-coins"></i>
                        <span class="loyalty-action-text"><?php echo esc_html__( 'Comment gagner des points', 'customiizer' ); ?></span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                    <button class="loyalty-action loyalty-how-use">
                        <i class="fas fa-shopping-cart"></i>
                        <span class="loyalty-action-text"><?php echo esc_html__( 'Comment utiliser mes points', 'customiizer' ); ?></span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="loyalty-widget-card loyalty-missions">
                    <h4><?php echo esc_html__( 'Missions', 'customiizer' ); ?></h4>
                    <p class="loyalty-missions-text">
                        <?php echo esc_html__( 'Rendez-vous dans votre espace client pour découvrir toutes les missions disponibles.', 'customiizer' ); ?>
                    </p>
                    <a class="loyalty-missions-link" href="/compte?tab=missions">
                        <?php echo esc_html__( 'Voir les missions', 'customiizer' ); ?>
                    </a>
                </div>
                <div class="loyalty-widget-card loyalty-referral">
                    <h4><?php echo esc_html__( 'Parrainage', 'customiizer' ); ?></h4>
                    <p><?php echo sprintf( esc_html__( '%d parrainages validés', 'customiizer' ), intval( $referrals ) ); ?></p>
                    <input type="text" readonly value="<?php echo esc_attr( $link ); ?>" style="width:100%;;" />
                </div>
            </div>
        <?php else : ?>
            <div class="loyalty-widget-page loyalty-page-main">
                <p class="loyalty-login-message">
                    <?php echo esc_html__( 'Connectez-vous ou créez un compte pour gagner 200 points, soit 2€ de réduction !', 'customiizer' ); ?>
                </p>
                <button class="loyalty-login-btn button" type="button"><?php echo esc_html__( 'Se connecter', 'customiizer' ); ?></button>
            </div>
        <?php endif; ?>

        <div class="loyalty-widget-page loyalty-page-get" style="display:none;">
            <div class="loyalty-widget-subheader">
                <span><?php echo esc_html__( 'Comment gagner des points', 'customiizer' ); ?></span>
            </div>
            <ul class="loyalty-explain-list">
                <li><?php echo esc_html__( '5 points sont crédités pour chaque euro dépensé hors taxes.', 'customiizer' ); ?></li>
                <li><?php echo esc_html__( 'Les points sont ajoutés lorsque votre commande passe au statut \'terminée\'.', 'customiizer' ); ?></li>
                <li><?php echo esc_html__( 'Accomplissez des missions pour obtenir les récompenses indiquées.', 'customiizer' ); ?></li>
                <li><?php echo esc_html__( 'Parrainez vos amis et gagnez un bonus pour chaque inscription validée.', 'customiizer' ); ?></li>
            </ul>
        </div>

        <div class="loyalty-widget-page loyalty-page-use" style="display:none;">
            <div class="loyalty-widget-subheader">
                <span><?php echo esc_html__( 'Comment utiliser mes points', 'customiizer' ); ?></span>
            </div>
            <ul class="loyalty-explain-list">
                <li><?php echo esc_html__( 'Au panier ou à la caisse, cliquez sur "Utiliser mes points".', 'customiizer' ); ?></li>
                <li><?php echo esc_html__( 'Saisissez le nombre de points à déduire (100 points = 1€).', 'customiizer' ); ?></li>
                <li><?php echo esc_html__( 'La réduction s\'applique immédiatement sur le total hors taxes.', 'customiizer' ); ?></li>
                <li><?php echo esc_html__( 'Votre solde restant est toujours visible dans votre espace client.', 'customiizer' ); ?></li>
            </ul>
        </div>
    </div>
</div>
