let currentPercentage = 0;
const totalElements = 2;  // Nombre total d'éléments à vérifier
let elementChecks = {
	profileImage: false,
};

function updateProgress(increment) {
	currentPercentage += increment;
	currentPercentage = Math.min(Math.round(currentPercentage), 100); // Toujours arrondi et limité à 100

	// 🧠 Le calcul logique est fait quoi qu'il arrive
	console.log(`🔄 Pourcentage logique actuel : ${currentPercentage}%`);

	// 🖼️ Puis on essaie d'afficher visuellement SI les éléments existent
	let progressRing = document.getElementById('progressRing');
	let percentageElement = document.getElementById('percentage');

	if (progressRing) {
		progressRing.style.setProperty('--percentage-value', `${currentPercentage}%`);
	}
	if (percentageElement) {
		percentageElement.textContent = `${currentPercentage}%`;
	}
}

function checkElement(elementId, checkFunction) {
	const element = document.getElementById(elementId);
	if (element) {
		if (checkFunction(element)) {
			if (!elementChecks[elementId]) {
				updateProgress(100 / totalElements);
				elementChecks[elementId] = true;  // Marquer comme vérifié
			}
		}
	}
}

// Exemple de fonctions de vérification spécifiques
function checkImageSrcNotEmpty(imageElement) {
	const srcValue = imageElement.getAttribute('src') || '';
	const result = srcValue.trim() !== '';
	return result;
}