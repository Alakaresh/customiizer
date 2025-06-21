// Fonction de redimensionnement du conteneur
function enableContainerResize() {
	const container = document.getElementById('container');
	const resizer = document.getElementById('resizer');
	const minHeight = 100; // Hauteur minimale autorisée
	const maxHeight = 300; // Hauteur maximale autorisée

	resizer.addEventListener('mousedown', (event) => {
		const startY = event.clientY;
		const startHeight = parseInt(getComputedStyle(container).height, 10);

		function resizeHandler(event) {
			const newHeight = startHeight + (event.clientY - startY);
			if (newHeight >= minHeight && newHeight <= maxHeight) {
				container.style.height = newHeight + 'px';
			} else if (newHeight < minHeight) {
				container.style.height = minHeight + 'px';
			} else if (newHeight > maxHeight) {
				container.style.height = maxHeight + 'px';
			}
		}

		document.addEventListener('mousemove', resizeHandler);
		document.addEventListener('mouseup', () => {
			document.removeEventListener('mousemove', resizeHandler);
		});
	});
}

// Fonction de vérification du contenu de l'entrée
function checkInput() {
	const customText = document.getElementById('custom-text');
	const placeholder = document.getElementById('placeholder');

	if (customText.textContent.trim() === '') {
		placeholder.style.display = 'block'; // Affiche le placeholder lorsque la zone de texte est vide
	} else {
		placeholder.style.display = 'none'; // Masque le placeholder lorsque la zone de texte contient du texte
	}
}

// Fonction de gestion du modal d'information
function enableInfoModal() {
	const infoText = document.querySelector('#aspect-ratio-info .info-text');
	const infoIcon = document.querySelector('#aspect-ratio-info .info-icon');
	const modalBackground = document.getElementById('info-modal-background');
	const okButton = document.querySelector('.ok-button');

	infoIcon.addEventListener('click', () => {
		modalBackground.style.display = 'block';
	});

	okButton.addEventListener('click', () => {
		modalBackground.style.display = 'none';
	});

	window.addEventListener('click', (event) => {
		if (event.target === modalBackground) {
			modalBackground.style.display = 'none';
		}
	});

	// Modifier le texte de l'info en fonction de l'élément texte "Aspect Ratio"
	const infoTitle = document.querySelector('.modal-title');
	infoTitle.textContent = infoText.textContent;
}

// Fonction d'ajustement de la hauteur des images
function adjustImageHeight() {
	const headerHeight = 90; // Hauteur du header
	const marginBetweenImages = 30; // Marge totale entre les images
	const gridHeight = (window.innerHeight - headerHeight - marginBetweenImages) / 2; // Divise l'espace restant par deux pour deux images en hauteur

	document.querySelectorAll('.image-grid img').forEach(img => {
		img.style.height = `${gridHeight}px`; // Ajuste la hauteur de chaque image
	});
}

function displayPrompt() {
	const urlParams = new URLSearchParams(window.location.search);
	const prompt = urlParams.get('prompt');
	const customText = document.getElementById('custom-text');
	const placeholder = document.getElementById('placeholder');

	if (customText) {
		if (prompt) {
			customText.textContent = prompt;
		}

		if (customText.textContent.trim() === '') {
			placeholder.style.display = 'block'; // Affiche le placeholder lorsque la zone de texte est vide
		} else {
			placeholder.style.display = 'none'; // Masque le placeholder lorsque la zone de texte contient du texte
		}
	} else {
		console.error('Element with ID "custom-text" not found.');
	}
}

// Appel des fonctions lors du chargement initial de la page
document.addEventListener('DOMContentLoaded', () => {
       enableContainerResize();
       //enableInfoModal();
       displayPrompt();
       const mq = window.matchMedia('(min-width: 769px)');
       const handle = () => {
               if (mq.matches) {
                       adjustImageHeight();
               }
       };
       handle();
       mq.addEventListener('change', handle);
       window.addEventListener('resize', handle);
});
