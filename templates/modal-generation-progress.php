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
                <div class="loading-bar" id="loading-bar"></div>
            </div>
            <div class="loading-text" id="loading-text" aria-live="polite">Chargement... Veuillez patienter !</div>
        </div>
        <div id="generation-progress-preview" class="progress-preview hide" aria-hidden="true" aria-live="polite">
            <img id="generation-progress-preview-image" src="" alt="Aperçu de la génération en cours" loading="lazy" decoding="async" />
        </div>
    </div>
</div>
