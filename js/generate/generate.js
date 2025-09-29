if (typeof baseUrl === 'undefined') {
    var baseUrl = window.location.origin;
}

const LOG_PREFIX = '[Customiizer][Generate]';
const GENERATE_SAVED_VARIANT_STORAGE_KEY = 'customiizerSavedVariant';
console.log(`${LOG_PREFIX} Script initialisé`, { baseUrl });

const POLL_INTERVAL_MS = 1000;

let currentTaskId = null;
let currentJobId = null;
let pollTimeoutId = null;
let lastKnownStatus = null;
let prompt = '';
let jobFormat = '';
let loadingToggled = false;
let lastKnownProgress = null;
let lastKnownMessage = '';
let clearStateTimeoutId = null;
const PROGRESS_STORAGE_KEY = 'customiizerGenerationProgress';
const PROGRESS_EVENT_NAME = 'customiizer:generation-progress-update';
const UPSCALE_WAIT_MESSAGE = 'Finalisation des images en haute définition…';

jQuery(function($) {
        const validateButton = document.getElementById('validate-button');
        const customTextInput = document.getElementById('custom-text');
        const alertBox = document.getElementById('alert-box');
        const placeholderDiv = document.getElementById('placeholder');
        const inlineProgressWrapper = document.getElementById('generation-progress-inline-wrapper');
        const savedPromptText = localStorage.getItem('savedPromptText');
        const PLACEHOLDER_IMAGE_SRC = 'https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png';

        function getPreviewImageElement() {
                return document.getElementById('generation-preview-image');
        }

        function buildProgressMessage(progress, customMessage = '') {
                const numericProgress = Number(progress);
                const boundedProgress = Number.isFinite(numericProgress) ? Math.max(0, Math.min(100, numericProgress)) : 0;
                const rounded = Math.round(boundedProgress);
                const sanitizedMessage = typeof customMessage === 'string' ? customMessage.trim() : '';

                if (rounded <= 0) {
                        return 'Préparation de votre génération personnalisée…';
                }

                if (sanitizedMessage) {
                        return rounded >= 100 ? sanitizedMessage : `${sanitizedMessage} (${rounded}%)`;
                }

                if (rounded >= 100) {
                        return 'Génération finalisée !';
                }

                return `Génération en cours… ${rounded}%`;
        }

        function getPreviewWrapper() {
                return document.getElementById('generation-preview');
        }

        function getGridContainer() {
                return document.getElementById('image-grid');
        }

        function togglePreviewMode(isActive) {
                const previewWrapper = getPreviewWrapper();
                const gridContainer = getGridContainer();

                if (previewWrapper) {
                        previewWrapper.classList.toggle('is-active', Boolean(isActive));
                }

                if (gridContainer) {
                        gridContainer.classList.toggle('is-hidden', Boolean(isActive));
                }
        }

        const GENERATION_THUMBNAIL_LIMIT = 3;

        function createThumbnailPlaceholder(index) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'image-container generation-thumbnail is-placeholder';
                button.setAttribute('data-thumbnail-index', String(index));
                button.setAttribute('aria-label', `Miniature ${index + 1}`);

                const image = document.createElement('img');
                image.src = PLACEHOLDER_IMAGE_SRC;
                image.alt = "Image d'attente";

                button.appendChild(image);

                return button;
        }

        function setThumbnailPlaceholder(button, index) {
                if (!button) {
                        return;
                }

                const img = button.querySelector('img');

                button.classList.add('is-placeholder');
                button.classList.remove('is-active');
                button.setAttribute('data-thumbnail-index', String(index));
                button.setAttribute('aria-label', `Miniature ${index + 1}`);

                if (typeof $.fn.removeData === 'function') {
                        $(button).removeData('imageData');
                }

                if (img) {
                        img.src = PLACEHOLDER_IMAGE_SRC;
                        img.alt = "Image d'attente";
                        img.classList.remove('preview-enlarge');
                }

                ['data-image-url', 'data-image-alt', 'data-job-id', 'data-task-id', 'data-format-image', 'data-prompt', 'data-display_name', 'data-user-logo', 'data-user-id'].forEach(
                        attribute => {
                                button.removeAttribute(attribute);
                        }
                );
        }

        function setThumbnailData(button, imageData, index) {
                if (!button || !imageData || !imageData.url) {
                        return;
                }

                const img = button.querySelector('img') || document.createElement('img');

                button.classList.remove('is-placeholder');
                button.classList.remove('is-active');
                button.setAttribute('data-thumbnail-index', String(index));
                button.setAttribute('aria-label', imageData.alt || `Miniature ${index + 1}`);

                if (!button.contains(img)) {
                        button.appendChild(img);
                }

                img.src = imageData.url;
                img.alt = imageData.alt || 'Image générée';
                img.classList.remove('preview-enlarge');

                if (typeof $.fn.data === 'function') {
                        $(button).data('imageData', imageData);
                }
        }

        function ensureGridPlaceholders() {
                const gridContainer = getGridContainer();
                if (!gridContainer) {
                        return;
                }

                let thumbnails = Array.from(gridContainer.querySelectorAll('.generation-thumbnail'));

                if (thumbnails.length !== GENERATION_THUMBNAIL_LIMIT) {
                        gridContainer.innerHTML = '';
                        for (let i = 0; i < GENERATION_THUMBNAIL_LIMIT; i++) {
                                gridContainer.appendChild(createThumbnailPlaceholder(i));
                        }
                        return;
                }

                thumbnails.forEach((button, index) => {
                        setThumbnailPlaceholder(button, index);
                });
        }

        function applyPreviewImageData(previewImage, imageData) {
                if (!previewImage || !imageData || !imageData.url) {
                        return;
                }

                clearPreviewImageDatasets(previewImage);
                previewImage.src = imageData.url;
                previewImage.alt = imageData.alt || 'Image générée';
                previewImage.classList.add('preview-enlarge');

                const attributeMap = {
                        'data-format-image': imageData.format || '',
                        'data-prompt': imageData.prompt || '',
                        'data-display_name': imageData.displayName || '',
                        'data-user-logo': imageData.userLogo || '',
                        'data-user-id': imageData.userId || '',
                        'data-job-id': imageData.jobId || '',
                        'data-task-id': imageData.taskId || '',
                };

                Object.entries(attributeMap).forEach(([attribute, value]) => {
                        if (value) {
                                previewImage.setAttribute(attribute, value);
                        } else {
                                previewImage.removeAttribute(attribute);
                        }
                });
        }

        function normalizeRenderedImage(imageData, index) {
                if (!imageData || typeof imageData.url !== 'string') {
                        return null;
                }

                const trimmedUrl = imageData.url.trim();
                if (!trimmedUrl) {
                        return null;
                }

                const promptText = typeof imageData.prompt === 'string' && imageData.prompt.trim() !== '' ? imageData.prompt.trim() : (prompt || '');
                const altText = promptText || `Image générée ${index + 1}`;

                return {
                        url: trimmedUrl,
                        alt: altText,
                        prompt: promptText,
                        displayName: imageData.display_name || '',
                        userLogo: imageData.user_logo || '',
                        userId: imageData.user_id || '',
                        format: imageData.format || jobFormat || '',
                        jobId: currentJobId || '',
                        taskId: currentTaskId || '',
                };
        }

        function showPreviewPlaceholder() {
                const previewImage = getPreviewImageElement();
                if (!previewImage) {
                        return;
                }

                togglePreviewMode(true);
                clearPreviewImageDatasets(previewImage);
                previewImage.src = PLACEHOLDER_IMAGE_SRC;
                previewImage.alt = "Image d'attente";
                previewImage.classList.remove('preview-enlarge');
        }

        function clearPreviewImageDatasets(imageElement) {
                if (!imageElement) {
                        return;
                }

                imageElement.removeAttribute('data-job-id');
                imageElement.removeAttribute('data-task-id');
                imageElement.removeAttribute('data-format-image');
                imageElement.removeAttribute('data-prompt');
                imageElement.removeAttribute('data-display_name');
                imageElement.removeAttribute('data-user-logo');
                imageElement.removeAttribute('data-user-id');

                if (imageElement.dataset && imageElement.dataset.livePreviewUrl) {
                        delete imageElement.dataset.livePreviewUrl;
                }
        }

        if (!validateButton || !customTextInput) {
                console.warn(`${LOG_PREFIX} Éléments requis introuvables, annulation du script`);
                return;
        }

        if (document.body) {
                document.body.dataset.generationPage = '1';
        }

        setupInlineProgressDisplay();

        if (savedPromptText) {
                customTextInput.textContent = savedPromptText;
                if (placeholderDiv) {
                        placeholderDiv.style.display = 'none';
                }
                localStorage.removeItem('savedPromptText');
        }

        restoreGenerationProgress();

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

                currentTaskId = null;
                currentJobId = null;
                lastKnownStatus = null;
                lastKnownProgress = null;
                lastKnownMessage = '';
                prompt = '';
                jobFormat = '';

                resetImageDisplay();
        }

        function startLoadingUI() {
                resetLoadingState();
                openProgressModal();
                lastKnownMessage = '';
                persistProgressState({
                        status: 'pending',
                        progress: 0,
                        message: '',
                        taskId: currentTaskId,
                        jobId: currentJobId,
                        prompt,
                        format: jobFormat,
                        title: '',
                });
        }

        function finalizeGeneration(hasError = false) {
                stopPolling();

                if (hasError) {
                        updateLoading(0);
                        lastKnownProgress = 0;
                } else {
                        updateLoading(100);
                        lastKnownProgress = 100;
                        updateLoadingText('');
                }

                persistProgressState({
                        status: hasError ? 'error' : 'done',
                        jobId: currentJobId,
                        taskId: currentTaskId,
                        progress: lastKnownProgress,
                        message: '',
                        completed: true,
                });
                lastKnownMessage = '';

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

                if (hasError) {
                        resetImageDisplay();
                }

                validateButton.disabled = false;
        }

        function scheduleNextPoll() {
                stopPolling();
                pollTimeoutId = setTimeout(() => pollJobStatus(), POLL_INTERVAL_MS);
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
                currentJobId = job.jobId || null;

                const progressValue = clampProgress(job.progress);
                if (progressValue !== null) {
                        lastKnownProgress = progressValue;
                        updateLoading(progressValue);
                }

                const jobStatus = typeof job.status === 'string' ? job.status.toLowerCase() : '';
                const jobImages = Array.isArray(job.images) ? job.images : [];
                let derivedStatus;

                if (jobStatus === 'error') {
                        derivedStatus = 'error';
                } else if (jobStatus === 'done' && jobImages.length > 0) {
                        derivedStatus = 'done';
                } else if (jobStatus === 'done') {
                        derivedStatus = 'waiting-upscale';
                } else if (progressValue !== null && progressValue >= 100) {
                        derivedStatus = 'waiting-upscale';
                } else {
                        derivedStatus = 'processing';
                }

                lastKnownStatus = derivedStatus;

                persistProgressState({
                        status: derivedStatus,
                        jobId: currentJobId,
                        taskId: currentTaskId,
                        progress: lastKnownProgress,
                        message: derivedStatus === 'waiting-upscale' ? UPSCALE_WAIT_MESSAGE : '',
                });

                const livePreviewUrl = typeof job.imageUrl === 'string' ? job.imageUrl : '';
                if (livePreviewUrl) {
                        updateLivePreview(livePreviewUrl);
                        persistProgressState({ imageUrl: livePreviewUrl });
                }

                if (derivedStatus === 'error') {
                        finalizeGeneration(true);
                        return;
                }

                if (derivedStatus === 'waiting-upscale') {
                        updateLoadingText(UPSCALE_WAIT_MESSAGE);
                        scheduleNextPoll();
                        return;
                }

                lastKnownMessage = '';

                if (derivedStatus === 'done') {
                        renderGeneratedImages(jobImages);
                        finalizeGeneration(false);
                        return;
                }

                scheduleNextPoll();
        }

        function renderGeneratedImages(images) {
                persistProgressState({ imageUrl: '' });

                const normalizedImages = Array.isArray(images)
                        ? images
                                        .map((imageData, index) => normalizeRenderedImage(imageData, index))
                                        .filter(Boolean)
                        : [];

                if (normalizedImages.length === 0) {
                        console.warn(`${LOG_PREFIX} Aucune image valide à afficher`, { images });
                        return;
                }

                const previewImage = getPreviewImageElement();
                if (previewImage) {
                        applyPreviewImageData(previewImage, normalizedImages[0]);
                }

                const gridContainer = getGridContainer();
                if (gridContainer) {
                        ensureGridPlaceholders();

                        const thumbnails = Array.from(gridContainer.querySelectorAll('.generation-thumbnail'));
                        const thumbnailImages = normalizedImages.slice(1, GENERATION_THUMBNAIL_LIMIT + 1);

                        thumbnails.forEach((button, index) => {
                                const imageData = thumbnailImages[index];
                                if (imageData) {
                                        setThumbnailData(button, imageData, index);
                                } else {
                                        setThumbnailPlaceholder(button, index);
                                }
                        });
                }

                togglePreviewMode(false);

                if (typeof adjustImageHeight === 'function') {
                        adjustImageHeight();
                }

                if (typeof enableImageEnlargement === 'function') {
                        enableImageEnlargement();
                }

                console.log(`${LOG_PREFIX} Images rendues`, { images });
        }

        function updateLivePreview(imageUrl) {
                if (!imageUrl) {
                        return;
                }

                const previewImage = getPreviewImageElement();
                if (!previewImage) {
                        return;
                }

                togglePreviewMode(true);
                if (previewImage.dataset && previewImage.dataset.livePreviewUrl === imageUrl) {
                        return;
                }

                clearPreviewImageDatasets(previewImage);

                if (previewImage.dataset) {
                        previewImage.dataset.livePreviewUrl = imageUrl;
                }

                previewImage.classList.remove('preview-enlarge');
                previewImage.src = imageUrl;
                previewImage.alt = prompt ? `Aperçu de génération pour ${prompt}` : 'Aperçu de génération en cours';
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

                        const activeVariant = typeof window !== 'undefined' ? window.selectedVariant : null;
                        if (activeVariant && typeof activeVariant === 'object' && activeVariant.variant_id != null) {
                                try {
                                        const payload = {
                                                variantId: activeVariant.variant_id,
                                                productName: activeVariant.product_name || '',
                                                ratio: activeVariant.ratio_image || '',
                                        };
                                        localStorage.setItem(
                                                GENERATE_SAVED_VARIANT_STORAGE_KEY,
                                                JSON.stringify(payload)
                                        );
                                } catch (storageError) {
                                        console.warn(`${LOG_PREFIX} Impossible d'enregistrer la variante sélectionnée`, storageError);
                                }
                        } else {
                                localStorage.removeItem(GENERATE_SAVED_VARIANT_STORAGE_KEY);
                        }

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
                showPreviewPlaceholder();

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
                        lastKnownStatus = 'pending';
                        updateLoading(0);
                        updateLoadingText('');
                        persistProgressState({
                                taskId: currentTaskId,
                                status: lastKnownStatus,
                                message: '',
                        });

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

        function resetImageDisplay() {
                ensureGridPlaceholders();
                togglePreviewMode(false);

                const previewImage = getPreviewImageElement();
                if (!previewImage) {
                        return;
                }

                clearPreviewImageDatasets(previewImage);
                previewImage.src = PLACEHOLDER_IMAGE_SRC;
                previewImage.alt = "Image d'attente";
                previewImage.classList.remove('preview-enlarge');
                previewImage.removeAttribute('data-display_name');
                previewImage.removeAttribute('data-user-logo');
                previewImage.removeAttribute('data-user-id');
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
                const loadingPercentage = document.getElementById('loading-percentage');
                if (loadingBar) {
                        loadingBar.style.width = '0%';
                        loadingBar.setAttribute('aria-valuenow', '0');
                }
                if (loadingText) {
                        loadingText.textContent = '';
                }
                if (loadingPercentage) {
                        loadingPercentage.textContent = '0%';
                }
                lastKnownProgress = null;
                lastKnownMessage = '';
        }

        function openProgressModal() {
                const modal = document.getElementById('generation-progress-modal');
                if (!modal || loadingToggled) {
                        return;
                }

                modal.classList.remove('hide');
                modal.setAttribute('aria-hidden', 'false');
                updateInlineProgressVisibility(modal, true);
                loadingToggled = true;
        }

        function closeProgressModal() {
                const modal = document.getElementById('generation-progress-modal');
                if (!modal) {
                        return;
                }

                modal.classList.add('hide');
                modal.setAttribute('aria-hidden', 'true');
                updateInlineProgressVisibility(modal, false);
                loadingToggled = false;
        }

        function setupInlineProgressDisplay() {
                if (!inlineProgressWrapper) {
                        return;
                }

                const modal = document.getElementById('generation-progress-modal');
                if (!modal) {
                        return;
                }

                inlineProgressWrapper.appendChild(modal);
                inlineProgressWrapper.setAttribute('aria-hidden', modal.classList.contains('hide') ? 'true' : 'false');

                modal.classList.add('inline-mode');
                modal.setAttribute('role', 'region');
                modal.setAttribute('aria-modal', 'false');
                modal.setAttribute('aria-hidden', modal.classList.contains('hide') ? 'true' : 'false');

                const dialog = modal.querySelector('.generation-progress-dialog');
                if (dialog) {
                        dialog.classList.add('inline-mode');
                        dialog.setAttribute('role', 'presentation');
                }

                updateInlineProgressVisibility(modal, !modal.classList.contains('hide'));
        }

        function updateInlineProgressVisibility(modal, isVisible) {
                if (!inlineProgressWrapper || !modal || !inlineProgressWrapper.contains(modal)) {
                        return;
                }

                inlineProgressWrapper.classList.toggle('is-active', Boolean(isVisible));
                inlineProgressWrapper.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
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
                                title: '',
                                ...previousState,
                                ...partialState,
                                updatedAt: Date.now(),
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
                lastKnownMessage = typeof storedState.message === 'string' ? storedState.message.trim() : '';

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
                        showPreviewPlaceholder();
                }

                if (typeof storedState.imageUrl === 'string' && storedState.imageUrl) {
                        updateLivePreview(storedState.imageUrl);
                }

                if (!isFinal) {
                        validateButton.disabled = true;
                        scheduleNextPoll();
                } else {
                        pollJobStatus();
                }
        }

        function updateLoading(percent) {
                const loadingBar = document.getElementById('loading-bar');
                const loadingText = document.getElementById('loading-text');
                const loadingPercentage = document.getElementById('loading-percentage');

                const normalizedPercent = clampProgress(percent);
                const percentValue = normalizedPercent === null ? 0 : normalizedPercent;
                const roundedPercent = Math.round(percentValue);

                persistProgressState({
                        progress: percentValue,
                });

                const message = buildProgressMessage(percentValue, lastKnownMessage);

                if (!loadingBar || !loadingText) {
                        return;
                }

                loadingBar.style.width = `${percentValue}%`;
                loadingBar.setAttribute('aria-valuenow', String(roundedPercent));
                if (loadingPercentage) {
                        loadingPercentage.textContent = `${roundedPercent}%`;
                }
                loadingText.textContent = message;
        }

        function updateLoadingText(text) {
                const sanitizedText = typeof text === 'string' ? text.trim() : '';
                lastKnownMessage = sanitizedText;
                persistProgressState({
                        message: sanitizedText,
                });
                const loadingText = document.getElementById('loading-text');
                const loadingPercentage = document.getElementById('loading-percentage');
                const progressValue = lastKnownProgress === null ? 0 : lastKnownProgress;
                const roundedPercent = Math.round(progressValue);
                const message = buildProgressMessage(progressValue, sanitizedText);

                if (loadingText) {
                        loadingText.textContent = message;
                }
                if (loadingPercentage) {
                        loadingPercentage.textContent = `${roundedPercent}%`;
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
