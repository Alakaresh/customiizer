<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="generation-progress-modal" class="generation-progress-modal hide" role="dialog" aria-modal="true" aria-labelledby="generation-progress-title" aria-describedby="loading-text" aria-hidden="true">
    <div class="generation-progress-dialog" role="document">
        <h2 id="generation-progress-title" class="generation-progress-title">Génération en cours</h2>
        <div class="loading-container">
            <div class="loading-bar-border" role="presentation">
                <div
                    class="loading-bar"
                    id="loading-bar"
                    role="progressbar"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow="0"
                ></div>
                <div class="loading-percentage" id="loading-percentage" aria-hidden="true">0%</div>
            </div>
            <div class="loading-text" id="loading-text" aria-live="polite">Chargement... Veuillez patienter !</div>
        </div>
    </div>
</div>
