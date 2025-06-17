function modifyPrompt(promptText) {

    // Ajoutez selectedRatio à la fin du texte avec le préfixe "--ar" si selectedRatio est défini
    if (selectedRatio) {
        promptText += ` --ar ${selectedRatio}`;
    }

    return promptText;
}

