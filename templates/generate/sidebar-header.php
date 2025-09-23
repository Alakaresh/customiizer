<div id="header-container">
    <!-- Conteneur pour le texte personnalisé -->
    <div id="container">
        <div id="custom-text" contenteditable="true" oninput="checkInput()"></div>
        <div id="placeholder">Écrivez votre idée ici pour générer vos images personnalisées…</div>
        <div id="resizer"></div>
    </div>

    <!-- Affichage de la sélection du ratio -->
    <div id="selected-display">
        <button id="selected-info" disabled="disabled">Sélectionnez un format</button>
    </div>

    <!-- Conteneur pour le choix du ratio -->
    <div id="aspect-ratio-container" class="aspect-ratio-container">

        <!-- Conteneur pour les boutons Ratio et Generate alignés -->
    <div id="buttons-container">
        <!-- Bouton pour ouvrir le menu de ratio -->
        <button id="ratioButton" onclick="toggleRatioMenu()">
            Formats de produit
            <span id="arrow-icon" class="arrow-down"></span>
        </button>

        <!-- Bouton de génération -->
        <button type="submit" id="validate-button">Générer</button>
    </div>

    </div>

    <!-- Zone d'alerte pour les messages d'erreur ou autres alertes -->
    <div id="alert-box" style="display: none; color: red; margin-bottom: 10px;"></div>

</div>
