<?php
if ( ! defined( 'ABSPATH' ) ) {
    $wp_load = __DIR__ . '/../../../../../wp-load.php';
    if ( file_exists( $wp_load ) ) {
        require_once $wp_load;
    }
}
?>
<div class="loyalty-header-wrapper">
    <button
        id="loyalty-widget-button"
        class="icon-button loyalty-widget-button"
        type="button"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="loyalty-widget-popup"
    >
        <i class="fas fa-gift" aria-hidden="true"></i>
        <span class="loyalty-widget-label"><?php echo esc_html__( 'Mes avantages', 'customiizer' ); ?></span>
        <?php if ( $logged_in ) : ?>
            <span class="loyalty-widget-balance" aria-hidden="true"><?php echo intval( $points ); ?></span>
            <span class="screen-reader-text"><?php echo esc_html( sprintf( __( 'Vous avez %d custompoints disponibles.', 'customiizer' ), intval( $points ) ) ); ?></span>
        <?php endif; ?>
    </button>

    <div id="loyalty-widget-popup" role="dialog" aria-modal="true" aria-labelledby="loyalty-widget-title" aria-hidden="true">
        <header id="loyalty-widget-header">
            <button id="loyalty-widget-back" class="loyalty-back-main" type="button" aria-label="<?php echo esc_attr__( 'Retour', 'customiizer' ); ?>" style="display:none;">
                <i class="fas fa-arrow-left" aria-hidden="true"></i>
            </button>
            <img class="loyalty-widget-logo" src="<?php echo esc_url( get_stylesheet_directory_uri() . '/images/customiizerSiteImages/customPoint.png' ); ?>" alt="<?php echo esc_attr__( 'Customiizer', 'customiizer' ); ?>" />
            <div class="loyalty-header-info">
                <span class="loyalty-header-title" id="loyalty-widget-title"><?php echo esc_html__( 'Mes avantages', 'customiizer' ); ?></span>
                <span class="loyalty-header-points loyalty-widget-points">
                    <?php echo esc_html__( 'Custompoints', 'customiizer' ); ?> :
                    <strong class="loyalty-header-count"><?php echo intval( $points ); ?></strong>
                    <img src="<?php echo esc_url( get_stylesheet_directory_uri() . '/images/customiizerSiteImages/customPoint.png' ); ?>" alt="<?php echo esc_attr__( 'Custompoints', 'customiizer' ); ?>" />
                </span>
            </div>
            <button id="loyalty-widget-close" type="button" aria-label="<?php echo esc_attr__( 'Fermer', 'customiizer' ); ?>">&times;</button>
        </header>

        <div id="loyalty-widget-content">
            <?php if ( $logged_in ) : ?>
                <div class="loyalty-widget-page loyalty-page-main">
                    <div class="loyalty-widget-card">
                        <button class="loyalty-action loyalty-how-get" type="button">
                            <i class="fas fa-coins" aria-hidden="true"></i>
                            <span class="loyalty-action-text"><?php echo esc_html__( 'Comment gagner des points', 'customiizer' ); ?></span>
                            <i class="fas fa-arrow-right" aria-hidden="true"></i>
                        </button>
                        <button class="loyalty-action loyalty-how-use" type="button">
                            <i class="fas fa-shopping-cart" aria-hidden="true"></i>
                            <span class="loyalty-action-text"><?php echo esc_html__( 'Comment utiliser mes points', 'customiizer' ); ?></span>
                            <i class="fas fa-arrow-right" aria-hidden="true"></i>
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
                        <div class="loyalty-copy-container">
                            <input id="loyalty-referral-link" class="loyalty-referral-input" type="text" readonly value="<?php echo esc_attr( $link ); ?>" />
                            <button type="button" class="loyalty-copy-referral" aria-label="<?php echo esc_attr__( 'Copier le lien', 'customiizer' ); ?>"><i class="fas fa-copy" aria-hidden="true"></i></button>
                            <span class="loyalty-copy-confirmation"><?php echo esc_html__( 'Copié !', 'customiizer' ); ?></span>
                        </div>
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
                    <li><?php echo esc_html__( 'Parrainez vos amis et gagnez 500 points chacun pour chaque inscription validée.', 'customiizer' ); ?></li>
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
</div>
