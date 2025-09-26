if (typeof baseUrl === 'undefined') {
    var baseUrl = window.location.origin;
}

const LOG_PREFIX = '[Customiizer][Generate]';
console.log(`${LOG_PREFIX} Script initialisé`, { baseUrl });

let currentTaskId = null;
let currentJobId = null;
let pollTimeoutId = null;
let lastKnownStatus = null;
let prompt = '';
let jobFormat = '';
let humorIntervalId = null;
let loadingToggled = false;
let generationClearTimeoutId = null;

const ACTIVE_GENERATION_STORAGE_KEY = 'customiizerActiveGeneration';
const STATUS_GENERATION_STORAGE_KEY = 'customiizerGenerationStatus';
const GENERATION_ACTIVE_EVENT = 'customiizer:generation-active';
const GENERATION_STATUS_EVENT = 'customiizer:generation-status';
const GENERATION_COMPLETE_EVENT = 'customiizer:generation-complete';

jQuery(function($) {
        const validateButton = document.getElementById('validate-button');
        const customTextInput = document.getElementById('custom-text');
        const alertBox = document.getElementById('alert-box');
        const placeholderDiv = document.getElementById('placeholder');
        const savedPromptText = localStorage.getItem('savedPromptText');

        function dispatchGenerationEvent(eventName, detail = {}) {
                try {
                        window.dispatchEvent(new CustomEvent(eventName, { detail }));
                } catch (error) {
                        console.warn(`${LOG_PREFIX} Impossible d'émettre l'événement ${eventName}`, error);
                }
        }

        function clearGenerationPersistence() {
                if (generationClearTimeoutId) {
                        clearTimeout(generationClearTimeoutId);
                        generationClearTimeoutId = null;
                }

                if (window.localStorage) {
                        localStorage.removeItem(ACTIVE_GENERATION_STORAGE_KEY);
                        localStorage.removeItem(STATUS_GENERATION_STORAGE_KEY);
                }

                dispatchGenerationEvent(GENERATION_COMPLETE_EVENT, {
                        taskId: currentTaskId,
                        jobId: currentJobId,
                });
        }

        function scheduleGenerationPersistenceClear(delay = 0) {
                if (generationClearTimeoutId) {
                        clearTimeout(generationClearTimeoutId);
                }

                generationClearTimeoutId = setTimeout(() => {
                        generationClearTimeoutId = null;
                        clearGenerationPersistence();
                }, Math.max(0, delay));
        }

        function persistActiveGeneration(taskId, jobId) {
                if (!window.localStorage) {
                        return;
                }

                const payload = {
                        taskId,
                        jobId: jobId || null,
                        startedAt: Date.now(),
                };

                try {
                        localStorage.setItem(ACTIVE_GENERATION_STORAGE_KEY, JSON.stringify(payload));
                } catch (error) {
                        console.warn(`${LOG_PREFIX} Impossible d'enregistrer la génération active`, error);
                }

                dispatchGenerationEvent(GENERATION_ACTIVE_EVENT, payload);
        }

        function persistGenerationStatus(data) {
                if (!window.localStorage) {
                        dispatchGenerationEvent(GENERATION_STATUS_EVENT, data);
                        return;
                }

                const progressValue = typeof data.progress === 'number'
                        ? Math.max(0, Math.min(100, Math.round(data.progress)))
                        : null;

                const payload = {
                        taskId: data.taskId || currentTaskId || '',
                        jobId: data.jobId || currentJobId || null,
                        status: data.status || '',
                        progress: progressValue,
                        message: data.message || '',
                        previewUrl: data.previewUrl || '',
                        prompt: data.prompt || prompt || '',
                        updatedAt: data.updatedAt || new Date().toISOString(),
                };

                try {
                        localStorage.setItem(STATUS_GENERATION_STORAGE_KEY, JSON.stringify(payload));
                } catch (error) {
                        console.warn(`${LOG_PREFIX} Impossible d'enregistrer le statut de génération`, error);
                }

                dispatchGenerationEvent(GENERATION_STATUS_EVENT, payload);
        }

        if (!validateButton || !customTextInput) {
                console.warn(`${LOG_PREFIX} Éléments requis introuvables, annulation du script`);
                return;
        }

        if (savedPromptText) {
                customTextInput.textContent = savedPromptText;
                if (placeholderDiv) {
                        placeholderDiv.style.display = 'none';
                }
                localStorage.removeItem('savedPromptText');
        }

        function showAlert(message) {
                if (!alertBox) {
                        return;
                }
                alertBox.textContent = message;
                alertBox.style.display = 'block';
        }

        function hideAlert() {
                if (!alertBox) {
                        return;
                }
                alertBox.style.display = 'none';
        }

        function stopPolling() {
                if (pollTimeoutId) {
                        clearTimeout(pollTimeoutId);
                        pollTimeoutId = null;
                }
        }

        function resetGenerationState() {
                console.log(`${LOG_PREFIX} Réinitialisation de l'état de génération`);
                stopPolling();
                clearGenerationPersistence();

                if (humorIntervalId) {
                        clearInterval(humorIntervalId);
                        humorIntervalId = null;
                }

                currentTaskId = null;
                currentJobId = null;
                lastKnownStatus = null;
                prompt = '';
                jobFormat = '';

                const container = document.getElementById('content-images');
                if (container) {
                        container.innerHTML = '';
                }

                updateImageGrid();
        }

        function startLoadingUI() {
                resetLoadingState();
                if (!loadingToggled) {
                        toggleLoading();
                }
                animateLoadingWithHumor();
        }

        function finalizeGeneration(hasError = false) {
                stopPolling();

                if (humorIntervalId) {
                        clearInterval(humorIntervalId);
                        humorIntervalId = null;
                }

                if (loadingToggled) {
                        toggleLoading();
                }

                if (hasError) {
                        updateLoading(0);
                } else {
                        updateLoading(100);
                }

                scheduleGenerationPersistenceClear(hasError ? 5000 : 3000);
                validateButton.disabled = false;
        }

        function scheduleNextPoll() {
                stopPolling();
                pollTimeoutId = setTimeout(() => pollJobStatus(), 1500);
        }

        async function pollJobStatus() {
                if (!currentTaskId) {
                        return;
                }

                try {
                        const response = await fetch(ajaxurl, {
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
                                const statusMessage = payload.data && payload.data.message ? payload.data.message : 'Statut indisponible';
                                throw new Error(statusMessage);
                        }

                        const job = payload.data;
                        if (!job) {
                                throw new Error('Réponse vide du serveur');
                        }

                        handleJobStatus(job);
                } catch (error) {
                        console.error(`${LOG_PREFIX} Erreur lors du suivi du job`, error);
                        showAlert("Une erreur est survenue pendant le suivi de la génération.");
                        finalizeGeneration(true);
                }
        }

        function handleJobStatus(job) {
                if (!job) {
                        return;
                }

                if (job.taskId) {
                        currentTaskId = job.taskId;
                }

                if (job.jobId) {
                        currentJobId = job.jobId;
                }

                if (job.status !== lastKnownStatus) {
                        console.log(`${LOG_PREFIX} Statut mis à jour`, job);
                }

                lastKnownStatus = job.status;

                const rawProgress = typeof job.progress === 'number'
                        ? job.progress
                        : (typeof job.progress === 'string' ? parseInt(job.progress, 10) : null);
                const hasProgress = rawProgress !== null && !Number.isNaN(rawProgress);
                const safeProgress = hasProgress ? Math.max(0, Math.min(100, Math.round(rawProgress))) : null;

                let message = job.progressMessage || job.message || '';
                const previewUrl = job.previewUrl || (job.result && job.result.url) || '';

                switch (job.status) {
                        case 'pending':
                                updateLoading(safeProgress !== null ? safeProgress : 15);
                                if (!message) {
                                        message = "Job enregistré, attente du worker...";
                                }
                                scheduleNextPoll();
                                break;
                        case 'processing':
                                updateLoading(safeProgress !== null ? safeProgress : 60);
                                if (!message) {
                                        message = 'Notre IA travaille sur votre création...';
                                }
                                scheduleNextPoll();
                                break;
                        case 'done':
                                updateLoading(100);
                                if (!message) {
                                        message = 'Génération terminée !';
                                }
                                renderGeneratedImages(job.images || []);
                                finalizeGeneration(false);
                                break;
                        case 'error':
                                if (!message) {
                                        message = 'La génération a échoué.';
                                }
                                showAlert("La génération a échoué. Veuillez réessayer.");
                                finalizeGeneration(true);
                                break;
                        default:
                                if (safeProgress !== null) {
                                        updateLoading(safeProgress);
                                }
                                scheduleNextPoll();
                                break;
                }

                if (message) {
                        updateLoadingText(message);
                }

                const statusPayload = {
                        taskId: job.taskId || currentTaskId || '',
                        jobId: currentJobId || job.jobId || null,
                        status: job.status || '',
                        progress: safeProgress,
                        message,
                        previewUrl,
                        prompt: job.prompt || prompt || '',
                        updatedAt: job.progressUpdatedAt || job.updatedAt || new Date().toISOString(),
                };

                persistGenerationStatus(statusPayload);
        }

        function renderGeneratedImages(images) {
                const container = document.getElementById('content-images');
                if (container) {
                        container.innerHTML = '';
                }

                const gridElement = document.getElementById('image-grid');
                if (gridElement) {
                        gridElement.classList.remove('hide');
                }

                const gridImages = document.querySelectorAll('.image-grid img');

                if (gridImages.length) {
                        gridImages.forEach((imageElement, index) => {
                                const imageData = images[index];

                                if (imageData && imageData.url) {
                                        imageElement.src = imageData.url;
                                        imageElement.alt = imageData.prompt || 'Image générée';
                                        imageElement.dataset.jobId = currentJobId || '';
                                        imageElement.dataset.taskId = currentTaskId || '';
                                        imageElement.dataset.formatImage = imageData.format || '';
                                        imageElement.dataset.prompt = imageData.prompt || prompt;
                                        imageElement.classList.add('preview-enlarge');
                                } else {
                                        imageElement.src = '/wp-content/themes/customiizer/images/customiizerSiteImages/attente.png';
                                        imageElement.alt = "En attente d'image";
                                        imageElement.removeAttribute('data-job-id');
                                        imageElement.removeAttribute('data-task-id');
                                }
                        });
                }

                console.log(`${LOG_PREFIX} Images rendues`, { images });
        }

        async function consumeCredit() {
                const creditsEl = document.getElementById('userCredits');
                if (!creditsEl) {
                        return;
                }

                let currentCredits = parseInt(creditsEl.textContent || '0', 10);
                if (Number.isNaN(currentCredits) || currentCredits <= 0) {
                        return;
                }

                currentCredits -= 1;
                creditsEl.textContent = currentCredits;

                const cached = sessionStorage.getItem('USER_ESSENTIALS');
                if (cached) {
                        try {
                                const cacheData = JSON.parse(cached);
                                if (cacheData.user_id === currentUser.ID) {
                                        cacheData.image_credits = currentCredits;
                                        sessionStorage.setItem('USER_ESSENTIALS', JSON.stringify(cacheData));
                                }
                        } catch (error) {
                                console.warn(`${LOG_PREFIX} Impossible de mettre à jour le cache des crédits`, error);
                        }
                }

                try {
                        await updateCreditsInDB(currentUser.ID);
                } catch (error) {
                        console.warn(`${LOG_PREFIX} Échec de la synchro des crédits`, error);
                }
        }

        validateButton.addEventListener('click', async function(event) {
                event.preventDefault();

                resetGenerationState();
                resetLoadingState();

                const ratioSetting = selectedRatio;
                jobFormat = ratioSetting;
                prompt = customTextInput.textContent.trim();

                console.log(`${LOG_PREFIX} Demande de génération`, {
                        prompt,
                        format_image: jobFormat,
                        userId: currentUser && currentUser.ID,
                });

                if (!prompt) {
                        showAlert('Veuillez entrer du texte avant de générer des images.');
                        return;
                }

                if (!ratioSetting) {
                        showAlert("Veuillez choisir une taille d'image avant de générer des images.");
                        return;
                }

                if (!currentUser || !currentUser.ID) {
                        localStorage.setItem('savedPromptText', prompt);
                        showAlert('Vous devez être connecté pour générer des images.');
                        if (typeof openLoginModal === 'function') {
                                openLoginModal();
                        }
                        return;
                }

                const creditsEl = document.getElementById('userCredits');
                const credits = creditsEl ? parseInt(creditsEl.textContent || '0', 10) : 0;

                if (!credits || credits <= 0) {
                        showAlert("Vous n'avez pas assez de crédits pour générer des images.");
                        return;
                }

                hideAlert();
                validateButton.disabled = true;
                startLoadingUI();
                updateImageGrid();

                try {
                        const response = await fetch('/wp-content/themes/customiizer/includes/proxy/generate_image.php', {
                                method: 'POST',
                                headers: {
                                        'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                        prompt,
                                        format_image: jobFormat,
                                }),
                        });

                        if (!response.ok) {
                                throw new Error(`HTTP ${response.status}`);
                        }

                        const data = await response.json();
                        console.log(`${LOG_PREFIX} Réponse du backend`, data);

                        if (!data.success || !data.taskId) {
                                throw new Error(data.message || 'Réponse invalide du backend');
                        }

                        currentTaskId = data.taskId;
                        currentJobId = data.jobId || null;
                        lastKnownStatus = data.status || 'pending';
                        persistActiveGeneration(currentTaskId, currentJobId);
                        persistGenerationStatus({
                                taskId: currentTaskId,
                                jobId: currentJobId,
                                status: lastKnownStatus,
                                progress: 0,
                                message: 'Job envoyé au worker...',
                                prompt,
                        });
                        updateLoading(10);
                        updateLoadingText('Job envoyé au worker...');

                        consumeCredit();
                        scheduleNextPoll();
                } catch (error) {
                        console.error(`${LOG_PREFIX} Erreur lors de la création du job`, error);
                        showAlert("Une erreur est survenue pendant la génération. Veuillez réessayer.");
                        finalizeGeneration(true);
                }
        });

        async function updateCreditsInDB(userId) {
                const response = await fetch(ajaxurl, {
                        method: 'POST',
                        headers: {
                                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        },
                        body: new URLSearchParams({
                                action: 'decrement_credits',
                                user_id: userId,
                        }),
                });

                if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                }

                await response.json();
        }

        function updateImageGrid() {
                const gridImages = document.querySelectorAll('.image-grid img');
                gridImages.forEach(image => {
                        image.src = '/wp-content/themes/customiizer/images/customiizerSiteImages/attente.png';
                        image.alt = "Image d'attente";
                });
        }

        function resetLoadingState() {
                const loadingBar = document.getElementById('loading-bar');
                const loadingText = document.getElementById('loading-text');
                if (loadingBar) {
                        loadingBar.style.width = '0%';
                }
                if (loadingText) {
                        loadingText.textContent = 'Notre IA est en pleine méditation créative...';
                }
                loadingToggled = false;
        }

        function toggleLoading() {
                const loadingContainer = document.querySelector('.loading-container');
                if (loadingContainer) {
                        loadingContainer.classList.toggle('hide');
                        loadingToggled = !loadingToggled;
                }
        }

        function animateLoadingWithHumor() {
                const humorousPhrases = [
                        "L'IA prend son café...",
                        'Les pixels se mettent en place... doucement.',
                        "Les algorithmes dansent la valse des neurones...",
                        "Consultation du manuel 'Comment créer une œuvre d'art'...",
                        "Préparation de l'image parfaite (ou presque)...",
                        'Les maths font leur magie en coulisse...',
                        'Génération de quelque chose de vraiment cool...',
                        "Application de la sauce IA secrète...",
                        'Vérification des probabilités de chef-d\'œuvre...',
                        "En train de demander l'aide d'un supercalculateur...",
                ];
                let currentIndex = 0;

                if (humorIntervalId) {
                        clearInterval(humorIntervalId);
                }

                humorIntervalId = setInterval(() => {
                        if (currentIndex >= humorousPhrases.length) {
                                currentIndex = 0;
                        }
                        updateLoadingText(humorousPhrases[currentIndex]);
                        currentIndex += 1;
                }, 2500);
        }

        function animateCompletionWithHumor() {
                const completionPhrases = [
                        "L'IA met les derniers coups de pinceau ...",
                        'Raffinement final... presque prêt à vous épater !',
                        "Encore un peu de magie... L'image est en cours de finition...",
                        "L'IA ajuste les derniers détails pour la perfection...",
                        'Finalisation en cours... C\'est bientôt prêt !',
                        'Derniers réglages... L\'image arrive dans un instant...',
                        'Votre image est en train de recevoir sa touche finale...',
                        'Optimisation des pixels pour un rendu optimal...',
                        "L'IA prend un pas de recul pour admirer... c'est presque prêt.",
                        'Finalisation... Préparez-vous à voir le résultat !',
                ];
                let currentIndex = 0;

                updateLoadingText(completionPhrases[currentIndex]);
                currentIndex += 1;

                if (humorIntervalId) {
                        clearInterval(humorIntervalId);
                }

                humorIntervalId = setInterval(() => {
                        if (currentIndex >= completionPhrases.length) {
                                currentIndex = 0;
                        }
                        updateLoadingText(completionPhrases[currentIndex]);
                        currentIndex += 1;
                }, 2500);
        }

        function updateLoading(percent) {
                const loadingBar = document.getElementById('loading-bar');
                const loadingText = document.getElementById('loading-text');

                if (!loadingBar || !loadingText) {
                        return;
                }

                loadingBar.style.width = `${percent}%`;

                if (percent > 0) {
                        loadingText.textContent = `Chargement : ${percent}%`;
                }

                if (percent > 0 && humorIntervalId && percent < 100) {
                        clearInterval(humorIntervalId);
                        humorIntervalId = null;
                }

                if (percent === 100) {
                        animateCompletionWithHumor();
                }
        }

        function updateLoadingText(text) {
                const loadingText = document.getElementById('loading-text');
                if (loadingText) {
                        loadingText.textContent = text;
                }
        }
});
