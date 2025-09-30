if (typeof baseUrl === 'undefined') {
    var baseUrl = window.location.origin;
}

const LOG_PREFIX = '[Customiizer][Generate]';
const POLL_INTERVAL_MS = 1000;
const GENERATE_PLACEHOLDER_IMAGE_SRC = 'https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png';

let pollTimeoutId = null;
let currentTaskId = null;
let currentJobId = null;

jQuery(function($) {
    console.log(`${LOG_PREFIX} Script initialisé`, { baseUrl });

    const validateButton = document.getElementById('validate-button');
    const customTextInput = document.getElementById('custom-text');
    const alertBox = document.getElementById('alert-box');

    if (!validateButton || !customTextInput) {
        console.warn(`${LOG_PREFIX} Impossible d'initialiser le module de génération : éléments manquants.`);
        return;
    }

    resetDisplayedImages();

    validateButton.addEventListener('click', async function(event) {
        event.preventDefault();

        hideAlert(alertBox);

        const prompt = (customTextInput.textContent || '').trim();
        const formatImage = typeof window.selectedRatio === 'string' ? window.selectedRatio : '';

        if (!prompt) {
            showAlert(alertBox, 'Veuillez entrer du texte avant de générer des images.');
            return;
        }

        if (!formatImage) {
            showAlert(alertBox, "Veuillez choisir une taille d'image avant de générer des images.");
            return;
        }

        validateButton.disabled = true;
        resetGenerationState();
        setPreviewPlaceholder();
        resetDisplayedImages();

        try {
            const taskId = await createGenerationJob({ prompt, formatImage });
            currentTaskId = taskId;
            scheduleNextPoll();
        } catch (error) {
            console.error(`${LOG_PREFIX} Erreur lors de la création du job`, error);
            showAlert(alertBox, "Une erreur est survenue pendant la génération. Veuillez réessayer.");
            validateButton.disabled = false;
        }
    });
});

function showAlert(alertBox, message) {
    if (!alertBox) {
        return;
    }
    alertBox.textContent = message;
    alertBox.style.display = 'block';
}

function hideAlert(alertBox) {
    if (!alertBox) {
        return;
    }
    alertBox.style.display = 'none';
    alertBox.textContent = '';
}

function resetGenerationState() {
    stopPolling();
    currentTaskId = null;
    currentJobId = null;
}

function stopPolling() {
    if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
        pollTimeoutId = null;
    }
}

function scheduleNextPoll() {
    stopPolling();
    pollTimeoutId = setTimeout(pollJobStatus, POLL_INTERVAL_MS);
}

async function createGenerationJob({ prompt, formatImage }) {
    const response = await fetch('/wp-content/themes/customiizer/includes/proxy/generate_image.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt,
            format_image: formatImage,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.taskId) {
        throw new Error(data.message || 'Réponse invalide du backend');
    }

    console.log(`${LOG_PREFIX} Job créé`, data);
    return data.taskId;
}

async function pollJobStatus() {
    if (!currentTaskId) {
        return;
    }

    try {
        const response = await fetch(window.ajaxurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
            body: new URLSearchParams({
                action: 'check_image_status',
                taskId: currentTaskId,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (!payload.success) {
            const message = payload.data && payload.data.message ? payload.data.message : 'Réponse invalide du backend';
            throw new Error(message);
        }

        const job = payload.data || {};
        currentJobId = job.jobId || job.job_id || null;
        const normalizedStatus = typeof job.status === 'string' ? job.status.toLowerCase() : '';

        console.log(`${LOG_PREFIX} Statut de job reçu`, {
            taskId: currentTaskId,
            jobId: currentJobId,
            status: normalizedStatus,
        });

        if (normalizedStatus === 'error') {
            throw new Error('Le job a échoué.');
        }

        if (normalizedStatus === 'done' && currentJobId) {
            stopPolling();
            try {
                const images = await fetchJobImages(currentJobId);
                renderJobImages(images);
            } catch (error) {
                console.error(`${LOG_PREFIX} Impossible de récupérer les images`, error);
                showAlert(document.getElementById('alert-box'), "Impossible de récupérer les images générées.");
            }

            const validateButton = document.getElementById('validate-button');
            if (validateButton) {
                validateButton.disabled = false;
            }
            currentTaskId = null;
            currentJobId = null;
            return;
        }

        scheduleNextPoll();
    } catch (error) {
        console.error(`${LOG_PREFIX} Erreur lors du suivi du job`, error);
        showAlert(document.getElementById('alert-box'), "Une erreur est survenue pendant le suivi de la génération.");

        const validateButton = document.getElementById('validate-button');
        if (validateButton) {
            validateButton.disabled = false;
        }
        currentTaskId = null;
        currentJobId = null;
        stopPolling();
    }
}

async function fetchJobImages(jobId) {
    const numericJobId = Number(jobId);
    if (!Number.isFinite(numericJobId) || numericJobId <= 0) {
        return [];
    }

    const response = await fetch(window.ajaxurl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: new URLSearchParams({
            action: 'get_job_images',
            jobId: String(numericJobId),
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (!payload.success) {
        const message = payload.data && payload.data.message ? payload.data.message : 'Réponse invalide du backend';
        throw new Error(message);
    }

    const images = Array.isArray(payload.data && payload.data.images) ? payload.data.images : [];
    console.log(`${LOG_PREFIX} Images récupérées pour le job`, {
        jobId: numericJobId,
        imagesCount: images.length,
    });
    return images;
}

function renderJobImages(images) {
    const gridContainer = document.getElementById('image-grid');
    const previewImage = document.getElementById('generation-preview-image');

    if (!gridContainer) {
        return;
    }

    gridContainer.innerHTML = '';

    const validImages = Array.isArray(images) ? images : [];

    if (!validImages.length) {
        fillGridWithPlaceholders(gridContainer);
        if (previewImage) {
            previewImage.src = GENERATE_PLACEHOLDER_IMAGE_SRC;
            previewImage.alt = "Image d'attente";
        }
        return;
    }

    validImages.slice(0, 4).forEach((imageData, index) => {
        const imageUrl = extractImageUrl(imageData);
        const wrapper = document.createElement('div');
        wrapper.className = `image-container ${index < 2 ? 'top' : 'bottom'}`;

        const image = document.createElement('img');
        image.src = imageUrl || GENERATE_PLACEHOLDER_IMAGE_SRC;
        image.alt = imageUrl ? `Image ${index + 1}` : "Image d'attente";
        image.className = index < 2 ? 'top' : 'bottom';

        wrapper.appendChild(image);
        gridContainer.appendChild(wrapper);
    });

    while (gridContainer.children.length < 4) {
        const index = gridContainer.children.length;
        const wrapper = document.createElement('div');
        wrapper.className = `image-container ${index < 2 ? 'top' : 'bottom'}`;

        const image = document.createElement('img');
        image.src = GENERATE_PLACEHOLDER_IMAGE_SRC;
        image.alt = "Image d'attente";
        image.className = index < 2 ? 'top' : 'bottom';

        wrapper.appendChild(image);
        gridContainer.appendChild(wrapper);
    }

    if (previewImage) {
        const firstUrl = extractImageUrl(validImages[0]);
        previewImage.src = firstUrl || GENERATE_PLACEHOLDER_IMAGE_SRC;
        previewImage.alt = firstUrl ? 'Aperçu de la génération' : "Image d'attente";
    }
}

function resetDisplayedImages() {
    const gridContainer = document.getElementById('image-grid');
    if (!gridContainer) {
        return;
    }
    gridContainer.innerHTML = '';
    fillGridWithPlaceholders(gridContainer);
}

function setPreviewPlaceholder() {
    const previewImage = document.getElementById('generation-preview-image');
    if (!previewImage) {
        return;
    }
    previewImage.src = GENERATE_PLACEHOLDER_IMAGE_SRC;
    previewImage.alt = "Image d'attente";
}

function fillGridWithPlaceholders(gridContainer) {
    for (let index = 0; index < 4; index += 1) {
        const wrapper = document.createElement('div');
        wrapper.className = `image-container ${index < 2 ? 'top' : 'bottom'}`;

        const image = document.createElement('img');
        image.src = GENERATE_PLACEHOLDER_IMAGE_SRC;
        image.alt = "Image d'attente";
        image.className = index < 2 ? 'top' : 'bottom';

        wrapper.appendChild(image);
        gridContainer.appendChild(wrapper);
    }
}

function extractImageUrl(imageData) {
    if (!imageData) {
        return '';
    }

    if (typeof imageData === 'string') {
        return imageData.trim();
    }

    const candidates = [
        imageData.url,
        imageData.image,
        imageData.image_url,
        imageData.imageUrl,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim() !== '') {
            return candidate.trim();
        }
    }

    return '';
}
