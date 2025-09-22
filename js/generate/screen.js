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

function normaliseRatioString(value) {
        if (!value) {
                return '';
        }

        return String(value)
                .replace(/[xX×]/g, ':')
                .replace(/\s+/g, '')
                .trim();
}

function parseRatio(value) {
        const normalised = normaliseRatioString(value);
        if (!normalised || !normalised.includes(':')) {
                return null;
        }

        const parts = normalised.split(':').map(Number);
        if (parts.length !== 2) {
                return null;
        }

        const [width, height] = parts;
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
                return null;
        }

        return { width, height };
}

function ratioFromImage(img) {
        const dataRatio = parseRatio(img.getAttribute('data-format-image'));
        if (dataRatio) {
                return dataRatio;
        }

        const container = img.closest('.image-container');
        if (container) {
                const containerRatio = parseRatio(container.getAttribute('data-format-image'));
                if (containerRatio) {
                        return containerRatio;
                }
        }

        if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
                return { width: img.naturalWidth, height: img.naturalHeight };
        }

        return null;
}

// Fonction d'ajustement de la hauteur des images
function adjustImageHeight() {
        const images = document.querySelectorAll('.image-grid img, #content-images > img.centered-image');
        if (images.length === 0) {
                return;
        }

        let needsRetry = false;

        images.forEach(img => {
                const ratio = ratioFromImage(img);
                const container = img.closest('.image-container');

                if (!ratio) {
                        img.style.removeProperty('height');
                        img.style.removeProperty('aspect-ratio');
                        if (container) {
                                container.style.removeProperty('aspect-ratio');
                        }
                        needsRetry = true;
                        return;
                }

                if (container) {
                        container.style.aspectRatio = `${ratio.width} / ${ratio.height}`;
                }

                if (img.matches('#content-images > img.centered-image')) {
                        img.style.aspectRatio = `${ratio.width} / ${ratio.height}`;
                } else {
                        img.style.removeProperty('aspect-ratio');
                }

                img.style.removeProperty('height');
        });

        if (needsRetry) {
                window.requestAnimationFrame(adjustImageHeight);
        }
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
