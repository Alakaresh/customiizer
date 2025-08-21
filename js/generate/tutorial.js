/*
var driverObj = window.driver.js.driver({
	showProgress: true,
	steps: getInitialSteps()
});

function getInitialSteps() {
    return [
        { 
            element: '#container', 
            popover: { 
                title: 'Enter Your Idea', 
                description: 'Describe your creative concept in the text field. This description will be the basis for generating a customized image. Let your imagination run wild!' 
            }
        },
        { 
            element: '.aspect-ratio-container', 
            popover: { 
                title: 'Select the Image Format', 
                description: 'Choose the image format that best suits your needs. You can select a specific aspect ratio or choose a product that will define the format for you.' 
            }
        },
        { 
            element: '#validate-button', 
            popover: { 
                title: 'Confirm Your Choices', 
                description: 'Check and confirm the selected settings to proceed with the image generation. Ensure everything is as you expect before continuing.' 
            }
        },
        { 
            element: '.content-images', 
            popover: { 
                title: 'View the Result', 
                description: 'Review the generated images here. If the outcome is to your satisfaction, you can use these images for product customization.' 
            }
        }
    ];
}


function startProductTour() {
	driverObj.drive();
	// Tu peux ajouter d'autres instructions ici si nécessaire
}

document.addEventListener("DOMContentLoaded", function() {
	logger.log("test" + userLevel);
	// Récupération des éléments du DOM
	var introScreen = document.getElementById("introScreen");
	var startTutorialBtn = document.getElementById("startTutorial");
	var closeIntroBtn = document.getElementById("closeIntro");

	// Gestionnaire d'événement pour le clic sur le bouton "Start Tutorial"
	startTutorialBtn.addEventListener("click", function() {
		startProductTour();
		hideIntroScreen();
	});

	// Gestionnaire d'événement pour le clic sur le bouton "Close"
	closeIntroBtn.addEventListener("click", function() {
		// Ici, vous pouvez ajouter le code pour fermer le modal sans démarrer le tutoriel
		// Pour l'exemple, nous masquons simplement le modal
		hideIntroScreen();
	});
});

// Fonction pour afficher le modal
function showIntroScreen() {
	introScreen.style.display = "flex";
}

// Fonction pour masquer le modal
function hideIntroScreen() {
	introScreen.style.display = "none";
}

$(document).on('userDetailsLoaded', function() {
	logger.log("test235")
    if (userLevel == 0) {
        showIntroScreen();
    }
});
*/