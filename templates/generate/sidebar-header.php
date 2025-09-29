<div id="header-container">
    <!-- Conteneur pour le texte personnalisé -->
    <div id="container">
        <div id="custom-text" contenteditable="true" oninput="checkInput()"></div>
        <div id="placeholder">Écrivez votre idée ici pour générer vos images personnalisées…</div>
        <div id="resizer"></div>
    </div>

    <!-- Affichage de la sélection du produit / format -->
    <div id="selected-display">
        <button
            id="variant-summary"
            class="variant-summary-card"
            type="button"
            aria-expanded="false"
            aria-controls="variant-display"
            onclick="toggleRatioMenu()"
        >
            <span class="variant-summary-card__media" aria-hidden="true">
                <img
                    id="variant-summary-image"
                    src="https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png"
                    alt=""
                    loading="lazy"
                />
            </span>
            <span class="variant-summary-card__info">
                <span class="variant-summary-card__label">Sélection du produit</span>
                <span id="selected-info" class="variant-summary-card__title">Sélectionnez un produit</span>
            </span>
            <span class="variant-summary-card__action" aria-hidden="true">
                <span class="variant-summary-card__cta">Choisir</span>
                <span class="variant-summary-card__icon"></span>
            </span>
        </button>
    </div>

    <!-- Conteneur pour le bouton de génération -->
    <div id="aspect-ratio-container" class="aspect-ratio-container">
        <div id="buttons-container">
            <button type="submit" id="validate-button">Générer</button>
        </div>
    </div>

    <!-- Zone d'alerte pour les messages d'erreur ou autres alertes -->
    <div id="alert-box" style="display: none; color: red; margin-bottom: 10px;"></div>

</div>
