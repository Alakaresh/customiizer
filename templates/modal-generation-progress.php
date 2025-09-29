<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="generation-progress-modal" class="generation-progress-modal hide" role="dialog" aria-modal="true" aria-labelledby="loading-text" aria-describedby="loading-text" aria-hidden="true">
    <div class="generation-progress-dialog" role="document">
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
