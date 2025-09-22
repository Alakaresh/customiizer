<div id="header-container" class="studio-panel studio-panel--prompt">
    <header class="studio-panel__header">
        <span class="studio-panel__eyebrow">Atelier IA</span>
        <h1 class="studio-panel__title">Décris ton idée</h1>
        <p class="studio-panel__description">Formule ton prompt pour générer des visuels uniques. Utilise des mots-clés précis et joue avec les styles pour affiner le rendu.</p>
    </header>

    <div class="prompt-input" aria-live="polite">
        <div id="container" class="prompt-input__editable">
            <div id="custom-text" contenteditable="true" oninput="checkInput()" role="textbox" aria-multiline="true"></div>
            <div id="placeholder">Écrivez votre idée ici pour générer vos images personnalisées…</div>
            <div id="resizer" aria-hidden="true"></div>
        </div>

        <div id="selected-display" class="prompt-input__selection">
            <span class="prompt-input__label">Format sélectionné</span>
            <button id="selected-info" class="prompt-input__badge" disabled="disabled">1:1</button>
        </div>
    </div>

    <div id="aspect-ratio-container" class="prompt-actions">
        <div id="buttons-container" class="prompt-actions__buttons">
            <button id="ratioButton" class="prompt-actions__button prompt-actions__button--ghost" onclick="toggleRatioMenu()">
                Format
                <span id="arrow-icon" class="prompt-actions__chevron"></span>
            </button>

            <button type="submit" id="validate-button" class="prompt-actions__button prompt-actions__button--primary">Générer</button>
        </div>
    </div>

    <div id="alert-box" class="prompt-panel__alert" style="display: none;"></div>

</div>
