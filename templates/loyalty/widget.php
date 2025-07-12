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
                <?php if ( ! empty( $missions ) ) : ?>
                    <ul class="loyalty-missions-list">
                        <?php foreach ( array_slice( $missions, 0, 3 ) as $m ) : ?>
                            <li>
                                <?php echo esc_html( $m['title'] ); ?>
                                <progress max="<?php echo intval( $m['goal'] ); ?>" value="<?php echo intval( $m['progress'] ); ?>"></progress>
                                <span><?php echo intval( $m['progress'] ); ?>/<?php echo intval( $m['goal'] ); ?></span>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                <?php else : ?>
                    <p><?php echo esc_html__( 'Aucune mission en cours', 'customiizer' ); ?></p>
                <?php endif; ?>
            </div>
            <div class="loyalty-widget-card loyalty-referral">
                <h4><?php echo esc_html__( 'Parrainage', 'customiizer' ); ?></h4>
                <p><?php echo sprintf( esc_html__( '%d parrainages validés', 'customiizer' ), intval( $referrals ) ); ?></p>
                <input type="text" readonly value="<?php echo esc_attr( $link ); ?>" style="width:100%;" />
            </div>
        </div>

        <div class="loyalty-widget-page loyalty-page-get" style="display:none;">
            <div class="loyalty-widget-subheader">
                <span><?php echo esc_html__( 'Comment gagner des points', 'customiizer' ); ?></span>
            </div>
            <p><?php echo esc_html__( 'Explications pour gagner des points...', 'customiizer' ); ?></p>
        </div>

        <div class="loyalty-widget-page loyalty-page-use" style="display:none;">
            <div class="loyalty-widget-subheader">
                <span><?php echo esc_html__( 'Comment utiliser mes points', 'customiizer' ); ?></span>
            </div>
            <p><?php echo esc_html__( 'Explications pour utiliser vos points...', 'customiizer' ); ?></p>
        </div>
    </div>
</div>
