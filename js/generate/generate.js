if (typeof baseUrl === 'undefined') {
    var baseUrl = window.location.origin;
}

const LOG_PREFIX = '[Customiizer][Generate]';
console.log(`${LOG_PREFIX} Script initialisé`, { baseUrl });

const POLL_INTERVAL_MS = 1000;
const UPSCALE_TARGET_COUNT = 4;

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
let previewGalleryImages = [];
let selectedPreviewIndex = 0;
let previewThumbnailsVisible = false;
const PROGRESS_STORAGE_KEY = 'customiizerGenerationProgress';
const PROGRESS_EVENT_NAME = 'customiizer:generation-progress-update';

jQuery(function($) {
        const customTextInput = document.getElementById('custom-text');
        const alertBox = document.getElementById('alert-box');
        const inlineProgressWrapper = document.getElementById('generation-progress-inline-wrapper');
        const PLACEHOLDER_IMAGE_SRC = 'https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png';

        const previewThumbnailsContainer = getPreviewThumbnailsContainer();
        if (previewThumbnailsContainer) {
                previewThumbnailsContainer.addEventListener('click', event => {
                        const targetButton = event.target.closest('[data-preview-index]');
                        if (!targetButton || targetButton.classList.contains('is-placeholder') || targetButton.disabled) {
                                return;
                        }

                        const parsedIndex = Number(targetButton.dataset.previewIndex);
                        if (!Number.isFinite(parsedIndex)) {
                                return;
                        }

                        handleThumbnailSelection(parsedIndex);
                });
        }

        resetPreviewGallery();
        setPreviewThumbnailsVisibility(false);

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

        function getPreviewThumbnailsContainer() {
                return document.getElementById('generation-preview-thumbnails');
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

        function ensureGridPlaceholders() {
                const gridContainer = getGridContainer();
                if (!gridContainer) {
                        return;
                }

                if (gridContainer.children.length < 4) {
                        gridContainer.innerHTML = '';
                        for (let i = 0; i < 4; i++) {
                                const wrapper = document.createElement('div');
                                wrapper.className = `image-container ${i < 2 ? 'top' : 'bottom'}`;

                                const image = document.createElement('img');
                                image.className = i < 2 ? 'top' : 'bottom';
                                image.alt = `Image ${i}`;
                                image.src = PLACEHOLDER_IMAGE_SRC;

                                wrapper.appendChild(image);
                                gridContainer.appendChild(wrapper);
                        }
                }

                gridContainer.querySelectorAll('img').forEach(image => {
                        image.src = PLACEHOLDER_IMAGE_SRC;
                        image.alt = "Image d'attente";
                        image.classList.remove('preview-enlarge');
                        if (image.dataset && image.dataset.livePreviewUrl) {
                                delete image.dataset.livePreviewUrl;
                        }
                        image.removeAttribute('data-job-id');
                        image.removeAttribute('data-task-id');
                        image.removeAttribute('data-format-image');
                        image.removeAttribute('data-prompt');
                        image.removeAttribute('data-display_name');
                        image.removeAttribute('data-user-logo');
                        image.removeAttribute('data-user-id');
                });
        }

        function showPreviewPlaceholder() {
                const previewImage = getPreviewImageElement();
                if (!previewImage) {
                        return;
                }

                setPreviewThumbnailsVisibility(false);
                resetPreviewGallery();
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

        function setPreviewThumbnailsVisibility(shouldShow) {
                previewThumbnailsVisible = Boolean(shouldShow);

                const thumbnailsContainer = getPreviewThumbnailsContainer();
                if (!thumbnailsContainer) {
                        return;
                }

                thumbnailsContainer.classList.toggle('is-hidden', !previewThumbnailsVisible);
                thumbnailsContainer.setAttribute('aria-hidden', previewThumbnailsVisible ? 'false' : 'true');
        }

        function resetPreviewGallery() {
                const thumbnailsContainer = getPreviewThumbnailsContainer();
                previewGalleryImages = [];
                selectedPreviewIndex = 0;

                if (!thumbnailsContainer) {
                        return;
                }

                thumbnailsContainer.innerHTML = '';

                for (let i = 0; i < 4; i++) {
                        const placeholderButton = document.createElement('button');
                        placeholderButton.type = 'button';
                        placeholderButton.className = 'generation-preview__thumbnail is-placeholder';
                        placeholderButton.disabled = true;

                        const placeholderImage = document.createElement('img');
                        placeholderImage.src = PLACEHOLDER_IMAGE_SRC;
                        placeholderImage.alt = "Image d'attente";

                        placeholderButton.appendChild(placeholderImage);
                        thumbnailsContainer.appendChild(placeholderButton);
                }
        }

        function applyImageMetaToElement(imageElement, imageData) {
                if (!imageElement || !imageData || typeof imageData.url !== 'string') {
                        return;
                }

                clearPreviewImageDatasets(imageElement);

                imageElement.src = imageData.url;
                imageElement.alt = imageData.prompt || 'Image générée';

                if (imageElement.dataset) {
                        imageElement.dataset.jobId = imageData.jobId || '';
                        imageElement.dataset.taskId = imageData.taskId || '';
                        imageElement.dataset.formatImage = imageData.formatImage || '';
                        imageElement.dataset.prompt = imageData.prompt || prompt;
                }

                imageElement.setAttribute('data-display_name', imageData.display_name || '');
                imageElement.setAttribute('data-user-logo', imageData.user_logo || '');
                imageElement.setAttribute('data-user-id', imageData.user_id || '');
        }

        function renderPreviewGallery() {
                const thumbnailsContainer = getPreviewThumbnailsContainer();
                const previewImage = getPreviewImageElement();

                if (!thumbnailsContainer || !previewImage) {
                        return;
                }

                if (!Array.isArray(previewGalleryImages) || previewGalleryImages.length === 0) {
                        resetPreviewGallery();
                        clearPreviewImageDatasets(previewImage);
                        previewImage.src = PLACEHOLDER_IMAGE_SRC;
                        previewImage.alt = "Image d'attente";
                        previewImage.classList.remove('preview-enlarge');
                        return;
                }

                if (selectedPreviewIndex >= previewGalleryImages.length) {
                        selectedPreviewIndex = 0;
                }

                const mainImage = previewGalleryImages[selectedPreviewIndex];
                if (!mainImage) {
                        resetPreviewGallery();
                        clearPreviewImageDatasets(previewImage);
                        previewImage.src = PLACEHOLDER_IMAGE_SRC;
                        previewImage.alt = "Image d'attente";
                        previewImage.classList.remove('preview-enlarge');
                        return;
                }

                applyImageMetaToElement(previewImage, mainImage);
                previewImage.classList.remove('preview-enlarge');

                thumbnailsContainer.innerHTML = '';
                const maxThumbnails = 4;
                const renderedThumbnails = previewGalleryImages.slice(0, maxThumbnails);

                renderedThumbnails.forEach((imageData, index) => {
                        const button = document.createElement('button');
                        button.type = 'button';
                        button.className = 'generation-preview__thumbnail';
                        button.dataset.previewIndex = String(index);
                        button.setAttribute('aria-label', `Afficher l'image ${index + 1}`);
                        button.setAttribute('aria-pressed', index === selectedPreviewIndex ? 'true' : 'false');
                        if (index === selectedPreviewIndex) {
                                button.classList.add('is-selected');
                        }

                        const thumbImage = document.createElement('img');
                        thumbImage.src = imageData.url;
                        thumbImage.alt = imageData.prompt || `Miniature ${index + 1}`;

                        button.appendChild(thumbImage);
                        thumbnailsContainer.appendChild(button);
                });

                const placeholdersNeeded = Math.max(0, maxThumbnails - renderedThumbnails.length);
                for (let i = 0; i < placeholdersNeeded; i++) {
                        const placeholderButton = document.createElement('button');
                        placeholderButton.type = 'button';
                        placeholderButton.className = 'generation-preview__thumbnail is-placeholder';
                        placeholderButton.disabled = true;

                        const placeholderImage = document.createElement('img');
                        placeholderImage.src = PLACEHOLDER_IMAGE_SRC;
                        placeholderImage.alt = "Image d'attente";

                        placeholderButton.appendChild(placeholderImage);
                        thumbnailsContainer.appendChild(placeholderButton);
                }
        }

        function buildImagesDebugSummary(rawImages) {
                if (!Array.isArray(rawImages) || rawImages.length === 0) {
                        return [];
                }

                return rawImages.map((imageData, index) => {
                        if (typeof imageData === 'string') {
                                return {
                                        index,
                                        type: 'string',
                                        url: imageData,
                                        length: imageData.length,
                                };
                        }

                        if (!imageData || typeof imageData !== 'object') {
                                return {
                                        index,
                                        type: typeof imageData,
                                };
                        }

                        const summary = {
                                index,
                                type: 'object',
                                keys: Object.keys(imageData),
                        };

                        const extractedUrl = extractImageUrlFromData(imageData);
                        if (extractedUrl) {
                                summary.url = extractedUrl;
                        }

                        const knownFields = [
                                'id',
                                'jobId',
                                'status',
                                'prompt',
                                'format',
                                'format_image',
                                'formatImage',
                                'display_name',
                                'user_logo',
                                'user_id',
                        ];

                        knownFields.forEach(field => {
                                const value = imageData[field];
                                if (value == null || typeof value === 'object') {
                                        return;
                                }

                                summary[field] = String(value);
                        });

                        return summary;
                });
        }

        function extractImageUrlFromData(imageData) {
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

        async function fetchJobImages(jobId) {
                const numericJobId = Number(jobId);
                if (!Number.isFinite(numericJobId) || numericJobId <= 0) {
                        return [];
                }

                try {
                        const response = await fetch(ajaxurl, {
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
                                const message = payload.data && payload.data.message ? payload.data.message : 'Réponse invalide';
                                throw new Error(message);
                        }

                        const responseData = payload.data || {};
                        const images = Array.isArray(responseData.images) ? responseData.images : [];
                        console.log(`${LOG_PREFIX} Images récupérées pour le job terminé`, {
                                jobId: numericJobId,
                                imagesCount: images.length,
                                imagesSummary: buildImagesDebugSummary(images),
                        });
                        return images;
                } catch (error) {
                        console.error(`${LOG_PREFIX} Impossible de récupérer les images du job`, {
                                jobId: numericJobId,
                                error,
                        });
                        throw error;
                }
        }

        function normalizeImageDataForPreview(imageData) {
                const imageUrl = extractImageUrlFromData(imageData);
                if (!imageUrl) {
                        return null;
                }

                let normalizedPrompt = prompt;
                if (imageData && typeof imageData.prompt === 'string' && imageData.prompt.trim() !== '') {
                        normalizedPrompt = imageData.prompt;
                }

                const formatCandidates = [
                        imageData && imageData.format,
                        imageData && imageData.format_image,
                        imageData && imageData.formatImage,
                ];

                let normalizedFormat = '';
                for (const candidate of formatCandidates) {
                        if (typeof candidate === 'string' && candidate.trim() !== '') {
                                normalizedFormat = candidate.trim();
                                break;
                        }
                }

                const displayNameCandidates = [
                        imageData && imageData.display_name,
                        imageData && imageData.displayName,
                ];

                let normalizedDisplayName = '';
                for (const candidate of displayNameCandidates) {
                        if (candidate != null && String(candidate).trim() !== '') {
                                normalizedDisplayName = String(candidate).trim();
                                break;
                        }
                }

                const userLogoCandidates = [imageData && imageData.user_logo, imageData && imageData.userLogo];
                let normalizedUserLogo = '';
                for (const candidate of userLogoCandidates) {
                        if (candidate != null && String(candidate).trim() !== '') {
                                normalizedUserLogo = String(candidate).trim();
                                break;
                        }
                }

                const userIdCandidates = [imageData && imageData.user_id, imageData && imageData.userId];
                let normalizedUserId = '';
                for (const candidate of userIdCandidates) {
                        if (candidate != null && String(candidate).trim() !== '') {
                                normalizedUserId = String(candidate).trim();
                                break;
                        }
                }

                const jobIdCandidates = [imageData && imageData.jobId, imageData && imageData.job_id];
                let normalizedJobId = currentJobId || '';
                for (const candidate of jobIdCandidates) {
                        if (candidate != null && String(candidate).trim() !== '') {
                                normalizedJobId = String(candidate).trim();
                                break;
                        }
                }

                const taskIdCandidates = [imageData && imageData.taskId, imageData && imageData.task_id];
                let normalizedTaskId = currentTaskId || '';
                for (const candidate of taskIdCandidates) {
                        if (candidate != null && String(candidate).trim() !== '') {
                                normalizedTaskId = String(candidate).trim();
                                break;
                        }
                }

                return {
                        url: imageUrl,
                        prompt: normalizedPrompt,
                        formatImage: normalizedFormat,
                        jobId: normalizedJobId,
                        taskId: normalizedTaskId,
                        display_name: normalizedDisplayName,
                        user_logo: normalizedUserLogo,
                        user_id: normalizedUserId,
                };
        }

        function populatePreviewGallery(images) {
                if (!Array.isArray(images)) {
                        previewGalleryImages = [];
                        selectedPreviewIndex = 0;
                        renderPreviewGallery();
                        return;
                }

                const normalizedImages = images
                        .map(normalizeImageDataForPreview)
                        .filter(image => image && typeof image.url === 'string' && image.url.trim() !== '');

                previewGalleryImages = normalizedImages.slice(0, 4);
                selectedPreviewIndex = 0;
                renderPreviewGallery();
        }

        function handleThumbnailSelection(thumbnailIndex) {
                if (!Array.isArray(previewGalleryImages) || previewGalleryImages.length === 0) {
                        return;
                }

                if (typeof thumbnailIndex !== 'number' || thumbnailIndex < 0 || thumbnailIndex >= previewGalleryImages.length) {
                        return;
                }

                if (thumbnailIndex === selectedPreviewIndex) {
                        return;
                }

                selectedPreviewIndex = thumbnailIndex;
                renderPreviewGallery();
        }

        if (!customTextInput) {
                console.warn(`${LOG_PREFIX} Éléments requis introuvables, annulation du script`);
                return;
        }

        if (document.body) {
                document.body.dataset.generationPage = '1';
        }

        setupInlineProgressDisplay();

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

        function normalizeJobStatus(status) {
                if (typeof status !== 'string') {
                        return '';
                }

                return status.trim().toLowerCase();
        }

        function extractUpscaleDone(job) {
                if (!job || typeof job !== 'object') {
                        return 0;
                }

                const candidates = [
                        job.upscaleDone,
                        job.upscale_done,
                        job.upscaledDone,
                        job.upscaled_done,
                ];

                for (const value of candidates) {
                        const parsed = parseInt(value, 10);
                        if (Number.isFinite(parsed)) {
                                return parsed;
                        }
                }

                const numericValue = Number(job.upscaleDone);
                return Number.isFinite(numericValue) ? numericValue : 0;
        }

        function finalizeGeneration(hasError = false) {
                stopPolling();

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
        }

        function scheduleNextPoll() {
                stopPolling();

                if (currentTaskId) {
                        console.log(`${LOG_PREFIX} Suivi de statut désactivé, aucune nouvelle vérification planifiée.`, {
                                taskId: currentTaskId,
                        });
                }
        }

        async function pollJobStatus() {
                if (!currentTaskId) {
                        return;
                }

                console.log(`${LOG_PREFIX} Suivi de statut désactivé, aucune requête check_image_status effectuée.`, {
                        taskId: currentTaskId,
                });
        }

        async function handleJobStatus(job) {
                currentJobId = job.jobId || job.job_id || null;

                const previousMessage = lastKnownMessage;
                const progressValue = clampProgress(job.progress);
                if (progressValue !== null) {
                        lastKnownProgress = progressValue;
                        updateLoading(progressValue);
                }

                const remoteStatus = normalizeJobStatus(job.status);
                const upscaleDone = extractUpscaleDone(job);
                const hasCompleted = remoteStatus === 'done';
                const rawImages = Array.isArray(job.images) ? job.images : [];
                console.log(`${LOG_PREFIX} Statut pollé`, {
                        taskId: currentTaskId,
                        jobId: currentJobId,
                        rawStatus: job.status,
                        remoteStatus,
                        progress: progressValue,
                        upscaleDone,
                        hasCompleted,
                        imagesCount: rawImages.length,
                        imagesSummary: buildImagesDebugSummary(rawImages),
                });
                const isErrorStatus = remoteStatus === 'error';
                const progressForPersist = lastKnownProgress === null ? 0 : lastKnownProgress;
                const progressForMessage = progressValue !== null ? progressValue : progressForPersist;

                let derivedStatus = 'processing';
                if (isErrorStatus) {
                        derivedStatus = 'error';
                } else if (hasCompleted) {
                        derivedStatus = 'done';
                }

                let derivedMessage = '';
                if (!hasCompleted && !isErrorStatus && progressForMessage >= 100) {
                        derivedMessage = 'Finalisation des variantes HD…';
                }

                lastKnownStatus = derivedStatus;
                lastKnownMessage = derivedMessage;

                persistProgressState({
                        status: derivedStatus,
                        jobId: currentJobId,
                        taskId: currentTaskId,
                        progress: progressForPersist,
                        message: derivedMessage,
                        upscaleDone,
                });

                if (derivedMessage !== previousMessage) {
                        updateLoadingText(derivedMessage);
                }

                const livePreviewUrl = typeof job.imageUrl === 'string' ? job.imageUrl : '';
                if (livePreviewUrl) {
                        updateLivePreview(livePreviewUrl);
                        persistProgressState({ imageUrl: livePreviewUrl });
                }

                if (isErrorStatus) {
                        showAlert('Une erreur est survenue pendant la génération.');
                        finalizeGeneration(true);
                        return;
                }

                if (hasCompleted) {
                        let images = [];

                        try {
                                images = await fetchJobImages(currentJobId || job.jobId);
                                console.log(`${LOG_PREFIX} Images récupérées après statut done`, {
                                        taskId: currentTaskId,
                                        jobId: currentJobId,
                                        images,
                                        imagesSummary: buildImagesDebugSummary(images),
                                });
                        } catch (error) {
                                images = Array.isArray(job.images) ? job.images : [];
                                if (!Array.isArray(job.images) || job.images.length === 0) {
                                        console.warn(`${LOG_PREFIX} Job terminé mais aucune image n'a été renvoyée, nouvelle vérification programmée.`);
                                        scheduleNextPoll();
                                        return;
                                }
                        }

                        console.log(`${LOG_PREFIX} Tentative de rendu des images finalisées`, {
                                taskId: currentTaskId,
                                jobId: currentJobId,
                                imagesCount: images.length,
                                upscaleDone,
                                imagesSummary: buildImagesDebugSummary(images),
                        });

                        const renderResult = renderGeneratedImages(images);
                        const didRenderImages =
                                renderResult && typeof renderResult === 'object'
                                        ? Boolean(renderResult.didRenderImages)
                                        : false;
                        const validImageCount =
                                renderResult && typeof renderResult === 'object' && Number.isFinite(renderResult.validImageCount)
                                        ? renderResult.validImageCount
                                        : 0;

                        if (!didRenderImages) {
                                console.warn(`${LOG_PREFIX} Job signalé comme terminé mais images indisponibles, nouvelle vérification programmée.`);
                                scheduleNextPoll();
                                return;
                        }

                        if (validImageCount < UPSCALE_TARGET_COUNT) {
                                console.warn(`${LOG_PREFIX} Toutes les images ne sont pas encore disponibles, nouvelle vérification programmée.`, {
                                        validImageCount,
                                        targetCount: UPSCALE_TARGET_COUNT,
                                });
                                scheduleNextPoll();
                                return;
                        }

                        console.log(`${LOG_PREFIX} Rendu final confirmé, finalisation UI.`, {
                                taskId: currentTaskId,
                                jobId: currentJobId,
                        });
                        finalizeGeneration(false);
                        return;
                }

                console.log(`${LOG_PREFIX} Job non finalisé, suivi désactivé.`, {
                        taskId: currentTaskId,
                        jobId: currentJobId,
                        remoteStatus,
                        upscaleDone,
                });
        }

        function renderGeneratedImages(images) {
                const gridContainer = getGridContainer();
                persistProgressState({ imageUrl: '' });

                console.log(`${LOG_PREFIX} Images reçues pour le rendu`, {
                        imagesCount: Array.isArray(images) ? images.length : 0,
                        imagesSummary: buildImagesDebugSummary(Array.isArray(images) ? images : []),
                });

                const hasRenderableImages =
                        Array.isArray(images) &&
                        images.some(function(image) {
                                const candidateUrl = extractImageUrlFromData(image);
                                return typeof candidateUrl === 'string' && candidateUrl.trim() !== '';
                        });

                if (!hasRenderableImages) {
                        console.warn(`${LOG_PREFIX} Aucune image valide à afficher`, { images });
                        return { didRenderImages: false, validImageCount: 0 };
                }

                let hasUpdatedImage = false;

                const thumbnailsData = [];
                let validImageCount = 0;

                if (gridContainer) {
                        let gridImages = gridContainer.querySelectorAll('img');

                        if (gridImages.length < 4) {
                                ensureGridPlaceholders();
                                gridImages = gridContainer.querySelectorAll('img');
                        }

                        gridImages.forEach((imageElement, index) => {
                                const imageData = Array.isArray(images) ? images[index] : null;
                                const mergedImageData =
                                        imageData && typeof imageData === 'object'
                                                ? { ...imageData }
                                                : imageData
                                                        ? { url: imageData }
                                                        : {};

                                if (!mergedImageData.url) {
                                        const extractedUrl = extractImageUrlFromData(imageData);
                                        if (extractedUrl) {
                                                mergedImageData.url = extractedUrl;
                                        }
                                }

                                if (!mergedImageData.url && imageElement.dataset && imageElement.dataset.livePreviewUrl) {
                                        mergedImageData.url = imageElement.dataset.livePreviewUrl;
                                }

                                if (imageElement.dataset) {
                                        if (!mergedImageData.jobId && imageElement.dataset.jobId) {
                                                mergedImageData.jobId = imageElement.dataset.jobId;
                                        }
                                        if (!mergedImageData.taskId && imageElement.dataset.taskId) {
                                                mergedImageData.taskId = imageElement.dataset.taskId;
                                        }
                                        if (!mergedImageData.format && imageElement.dataset.formatImage) {
                                                mergedImageData.format = imageElement.dataset.formatImage;
                                        }
                                        if (!mergedImageData.prompt && imageElement.dataset.prompt) {
                                                mergedImageData.prompt = imageElement.dataset.prompt;
                                        }
                                }

                                if (!mergedImageData.display_name) {
                                        const existingDisplayName = imageElement.getAttribute('data-display_name');
                                        if (existingDisplayName) {
                                                mergedImageData.display_name = existingDisplayName;
                                        }
                                }

                                if (!mergedImageData.user_logo) {
                                        const existingLogo = imageElement.getAttribute('data-user-logo');
                                        if (existingLogo) {
                                                mergedImageData.user_logo = existingLogo;
                                        }
                                }

                                if (!mergedImageData.user_id) {
                                        const existingUserId = imageElement.getAttribute('data-user-id');
                                        if (existingUserId) {
                                                mergedImageData.user_id = existingUserId;
                                        }
                                }

                                const normalizedPreviewData = normalizeImageDataForPreview(mergedImageData);
                                if (!normalizedPreviewData) {
                                        return;
                                }

                                if (imageElement.dataset && imageElement.dataset.livePreviewUrl) {
                                        delete imageElement.dataset.livePreviewUrl;
                                }

                                imageElement.classList.remove('preview-enlarge');
                                imageElement.src = normalizedPreviewData.url;
                                imageElement.alt = normalizedPreviewData.prompt || 'Image générée';

                                if (imageElement.dataset) {
                                        imageElement.dataset.jobId = normalizedPreviewData.jobId || '';
                                        imageElement.dataset.taskId = normalizedPreviewData.taskId || '';
                                        imageElement.dataset.formatImage = normalizedPreviewData.formatImage || '';
                                        imageElement.dataset.prompt = normalizedPreviewData.prompt || prompt;
                                }

                                imageElement.setAttribute('data-display_name', normalizedPreviewData.display_name || '');
                                imageElement.setAttribute('data-user-logo', normalizedPreviewData.user_logo || '');
                                imageElement.setAttribute('data-user-id', normalizedPreviewData.user_id || '');
                                imageElement.classList.add('preview-enlarge');
                                hasUpdatedImage = true;

                                thumbnailsData.push(normalizedPreviewData);
                        });
                }

                validImageCount = thumbnailsData.filter(data => data && data.url).length;

                if (!hasUpdatedImage) {
                        console.warn(`${LOG_PREFIX} Les images renvoyées sont vides, aucune mise à jour effectuée.`);
                        return { didRenderImages: false, validImageCount };
                }

                console.log(`${LOG_PREFIX} Miniatures normalisées`, {
                        thumbnailsCount: thumbnailsData.length,
                        thumbnailsSummary: buildImagesDebugSummary(thumbnailsData),
                });

                if (thumbnailsData.length > 0) {
                        setPreviewThumbnailsVisibility(true);
                        populatePreviewGallery(thumbnailsData);
                }

                togglePreviewMode(true);
                closeProgressModal();

                console.log(`${LOG_PREFIX} Images rendues`, { images });
                return { didRenderImages: true, validImageCount };
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

        function resetImageDisplay() {
                ensureGridPlaceholders();
                togglePreviewMode(false);
                setPreviewThumbnailsVisibility(false);
                resetPreviewGallery();

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

                if (currentTaskId) {
                        console.log(`${LOG_PREFIX} Reprise de l'état stocké sans suivi automatique.`, {
                                taskId: currentTaskId,
                                status: storedState.status,
                        });
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
