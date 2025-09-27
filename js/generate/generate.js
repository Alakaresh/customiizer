if (typeof baseUrl === 'undefined') {
    var baseUrl = window.location.origin;
}

const LOG_PREFIX = '[Customiizer][Generate]';
console.log(`${LOG_PREFIX} Script initialisé`, { baseUrl });

let currentTaskId = null;
let currentJobId = null;
let lastKnownStatus = null;
let prompt = '';
let jobFormat = '';
let humorIntervalId = null;
let loadingToggled = false;
let lastKnownProgress = null;
let completionAnimationTriggered = false;
let clearStateTimeoutId = null;
const PROGRESS_STORAGE_KEY = 'customiizerGenerationProgress';
const PROGRESS_EVENT_NAME = 'customiizer:generation-progress-update';
const LOCAL_PROGRESS_SOURCE = 'generator';

jQuery(function($) {
        const validateButton = document.getElementById('validate-button');
        const customTextInput = document.getElementById('custom-text');
        const alertBox = document.getElementById('alert-box');
        const placeholderDiv = document.getElementById('placeholder');
        const savedPromptText = localStorage.getItem('savedPromptText');
        const originalButtonLabel = validateButton ? validateButton.textContent : '';

        if (!validateButton || !customTextInput) {
                console.warn(`${LOG_PREFIX} Éléments requis introuvables, annulation du script`);
                return;
        }

        if (document.body) {
                document.body.dataset.generationPage = '1';
        }

        if (savedPromptText) {
                customTextInput.textContent = savedPromptText;
                if (placeholderDiv) {
                        placeholderDiv.style.display = 'none';
                }
                localStorage.removeItem('savedPromptText');
        }

        customTextInput.addEventListener('input', () => {
                if (!placeholderDiv) {
                        return;
                }
                placeholderDiv.style.display = customTextInput.textContent.trim() === '' ? 'block' : 'none';
        });

        restoreGenerationProgress();

        window.addEventListener(PROGRESS_EVENT_NAME, (event) => {
                const detail = event.detail;
                if (!detail || detail._source === LOCAL_PROGRESS_SOURCE) {
                        return;
                }
                applyExternalProgressUpdate(detail);
        });

        function showAlert(message, type = 'error') {
                if (!alertBox) {
                        return;
                }

                alertBox.textContent = message;
                alertBox.style.display = 'block';
                alertBox.classList.remove('alert-error', 'alert-success', 'alert-info', 'alert-visible');
                const className = type === 'success'
                        ? 'alert-success'
                        : type === 'info'
                                ? 'alert-info'
                                : 'alert-error';
                alertBox.classList.add(className, 'alert-visible');
        }

        function hideAlert() {
                if (!alertBox) {
                        return;
                }
                alertBox.style.display = 'none';
                alertBox.classList.remove('alert-error', 'alert-success', 'alert-info', 'alert-visible');
                alertBox.textContent = '';
        }

        function setButtonLoading(isLoading) {
                if (!validateButton) {
                        return;
                }

                if (isLoading) {
                        validateButton.dataset.loading = '1';
                        validateButton.textContent = 'Envoi…';
                } else {
                        validateButton.textContent = originalButtonLabel;
                        validateButton.removeAttribute('data-loading');
                }
        }

        function stopPolling() {}

        function resetGenerationState() {
                console.log(`${LOG_PREFIX} Réinitialisation de l'état de génération`);
                stopPolling();

                if (humorIntervalId) {
                        clearInterval(humorIntervalId);
                        humorIntervalId = null;
                }

                currentTaskId = null;
                currentJobId = null;
                lastKnownStatus = null;
                lastKnownProgress = null;
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
                openProgressModal();
                persistProgressState({
                        status: 'pending',
                        progress: 0,
                        message: "Notre IA est en pleine méditation créative...",
                        taskId: currentTaskId,
                        jobId: currentJobId,
                        prompt,
                        format: jobFormat,
                        title: 'Génération en cours',
                });
                animateLoadingWithHumor();
        }

        function finalizeGeneration(hasError = false) {
                stopPolling();

                if (humorIntervalId) {
                        clearInterval(humorIntervalId);
                        humorIntervalId = null;
                }

                if (hasError) {
                        updateLoading(0);
                        lastKnownProgress = 0;
                } else {
                        updateLoading(100);
                        lastKnownProgress = 100;
                }

                persistProgressState({
                        status: hasError ? 'error' : 'done',
                        jobId: currentJobId,
                        taskId: currentTaskId,
                        progress: lastKnownProgress,
                        message: hasError ? 'La génération a échoué.' : 'Génération terminée !',
                        completed: true,
                });

                if (clearStateTimeoutId) {
                        clearTimeout(clearStateTimeoutId);
                }

                clearStateTimeoutId = setTimeout(() => {
                        clearStateTimeoutId = null;
                        clearProgressState();
                }, 4500);

                if (loadingToggled) {
                        closeProgressModal();
                }

                setButtonLoading(false);
                validateButton.disabled = false;
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

        function applyExternalProgressUpdate(update) {
                if (!update || !update.taskId) {
                        return;
                }

                currentTaskId = update.taskId;
                currentJobId = update.jobId || currentJobId;
                if (typeof update.prompt === 'string' && update.prompt) {
                        prompt = update.prompt;
                }
                if (typeof update.format === 'string' && update.format) {
                        jobFormat = update.format;
                }

                if (typeof update.status === 'string') {
                        lastKnownStatus = update.status;
                }

                const normalizedProgress = clampProgress(update.progress);
                if (normalizedProgress !== null) {
                        lastKnownProgress = normalizedProgress;
                        updateLoading(normalizedProgress);
                }

                if (typeof update.message === 'string' && update.message) {
                        updateLoadingText(update.message);
                }

                if (Array.isArray(update.images) && update.images.length) {
                        renderGeneratedImages(update.images);
                }

                const statePayload = {
                        status: lastKnownStatus,
                        jobId: currentJobId,
                        taskId: currentTaskId,
                };

                if (update.status === 'done' || update.status === 'error') {
                        statePayload.completed = true;
                }

                persistProgressState(statePayload);

                if (update.status === 'done') {
                        finalizeGeneration(false);
                } else if (update.status === 'error') {
                        showAlert("La génération a échoué. Veuillez réessayer.");
                        finalizeGeneration(true);
                }
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
                setButtonLoading(true);
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
                        lastKnownStatus = data.status || 'pending';
                        updateLoading(10);
                        updateLoadingText('Job envoyé au worker...');
                        persistProgressState({
                                taskId: currentTaskId,
                                status: lastKnownStatus,
                        });

                        consumeCredit();
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
                        image.removeAttribute('data-job-id');
                        image.removeAttribute('data-task-id');
                        image.removeAttribute('data-format-image');
                        image.removeAttribute('data-prompt');
                });
        }

        function resetLoadingState() {
                if (clearStateTimeoutId) {
                        clearTimeout(clearStateTimeoutId);
                        clearStateTimeoutId = null;
                }
                clearProgressState();
                closeProgressModal();
                const loadingBar = document.getElementById('loading-bar');
                const loadingText = document.getElementById('loading-text');
                if (loadingBar) {
                        loadingBar.style.width = '0%';
                }
                if (loadingText) {
                        loadingText.textContent = 'Notre IA est en pleine méditation créative...';
                }
                lastKnownProgress = null;
                completionAnimationTriggered = false;
                setButtonLoading(false);
        }

        function openProgressModal() {
                const modal = document.getElementById('generation-progress-modal');
                if (!modal || loadingToggled) {
                        return;
                }

                modal.classList.remove('hide');
                modal.setAttribute('aria-hidden', 'false');
                loadingToggled = true;
        }

        function closeProgressModal() {
                const modal = document.getElementById('generation-progress-modal');
                if (!modal) {
                        return;
                }

                modal.classList.add('hide');
                modal.setAttribute('aria-hidden', 'true');
                loadingToggled = false;
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

        function getStoredProgressState() {
                try {
                        const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
                        return raw ? JSON.parse(raw) : null;
                } catch (error) {
                        console.warn(`${LOG_PREFIX} Impossible de lire la progression stockée`, error);
                        return null;
                }
        }

        function broadcastProgressUpdate(state) {
                try {
                        window.dispatchEvent(new CustomEvent(PROGRESS_EVENT_NAME, { detail: state }));
                } catch (error) {
                        console.warn(`${LOG_PREFIX} Impossible de diffuser l'état de progression`, error);
                }
        }

        function persistProgressState(partialState = {}) {
                try {
                        const previousState = getStoredProgressState() || {};
                        const nextState = {
                                title: 'Génération en cours',
                                ...previousState,
                                ...partialState,
                                updatedAt: Date.now(),
                                _source: LOCAL_PROGRESS_SOURCE,
                        };
                        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(nextState));
                        broadcastProgressUpdate(nextState);
                        return nextState;
                } catch (error) {
                        console.warn(`${LOG_PREFIX} Impossible de stocker la progression`, error);
                        return null;
                }
        }

        function clearProgressState() {
                try {
                        localStorage.removeItem(PROGRESS_STORAGE_KEY);
                        broadcastProgressUpdate(null);
                } catch (error) {
                        console.warn(`${LOG_PREFIX} Impossible de réinitialiser la progression`, error);
                }
        }

        function restoreGenerationProgress() {
                const storedState = getStoredProgressState();
                if (!storedState || !storedState.taskId) {
                        return;
                }

                stopPolling();

                currentTaskId = storedState.taskId;
                currentJobId = storedState.jobId || null;
                lastKnownStatus = typeof storedState.status === 'string' ? storedState.status : null;
                const normalizedProgress = clampProgress(storedState.progress);
                lastKnownProgress = normalizedProgress === null ? null : normalizedProgress;

                openProgressModal();

                if (lastKnownProgress !== null) {
                        updateLoading(lastKnownProgress);
                }

                if (typeof storedState.message === 'string' && storedState.message) {
                        updateLoadingText(storedState.message);
                }

                const status = storedState.status;
                const isFinal = status === 'done' || status === 'error';

                if (!isFinal) {
                        validateButton.disabled = true;
                        setButtonLoading(true);
                } else {
                        setButtonLoading(false);
                        validateButton.disabled = false;
                }
        }

        function updateLoading(percent) {
                const loadingBar = document.getElementById('loading-bar');
                const loadingText = document.getElementById('loading-text');

                const normalizedPercent = clampProgress(percent);
                const percentValue = normalizedPercent === null ? 0 : normalizedPercent;

                persistProgressState({
                        progress: percentValue,
                });

                if (!loadingBar || !loadingText) {
                        return;
                }

                loadingBar.style.width = `${percentValue}%`;

                if (percentValue > 0) {
                        loadingText.textContent = `Chargement : ${Math.round(percentValue)}%`;
                }

                if (percentValue > 0 && humorIntervalId && percentValue < 100) {
                        clearInterval(humorIntervalId);
                        humorIntervalId = null;
                }

                if (percentValue === 100) {
                        if (!completionAnimationTriggered) {
                                animateCompletionWithHumor();
                                completionAnimationTriggered = true;
                        }
                } else {
                        completionAnimationTriggered = false;
                }
        }

        function updateLoadingText(text) {
                persistProgressState({
                        message: text,
                });
                const loadingText = document.getElementById('loading-text');
                if (loadingText) {
                        loadingText.textContent = text;
                }
        }

        function clampProgress(value) {
                if (typeof value === 'undefined' || value === null || value === '') {
                        return null;
                }

                const sanitizedValue = typeof value === 'string'
                        ? value.replace(/%/g, '').trim()
                        : value;

                const numericValue = Number(sanitizedValue);
                if (!Number.isFinite(numericValue)) {
                        return null;
                }

                if (numericValue < 0) {
                        return 0;
                }

                if (numericValue > 100) {
                        return 100;
                }

                return numericValue;
        }
});
