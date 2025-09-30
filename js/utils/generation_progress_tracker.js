(function() {
    const STORAGE_KEY = 'customiizerGenerationProgress';
    const EVENT_NAME = 'customiizer:generation-progress-update';
    const LOG_PREFIX = '[Customiizer][ProgressTracker]';
    const AJAX_URL = typeof window.ajaxurl === 'string' ? window.ajaxurl : '/wp-admin/admin-ajax.php';
    const FINAL_STATUSES = new Set(['done', 'error']);
    const UPSCALE_TARGET_COUNT = 4;
    const POLL_INTERVAL_MS = 1000;
    const INIT_RETRY_DELAY_MS = 75;
    const MAX_INIT_RETRIES = 20;

    let modal = null;
    let loadingBar = null;
    let loadingText = null;
    let loadingPercentage = null;
    let currentState = null;
    let pollTimeoutId = null;
    let hideTimeoutId = null;
    let ignoreNextEvent = false;
    let isInitialized = false;
    let initRetryCount = 0;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => tryInitialize(false));
    } else {
        tryInitialize(false);
    }

    window.addEventListener('pageshow', () => tryInitialize(true));
    window.addEventListener('focus', handleVisibilityGain);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            handleVisibilityGain();
        }
    });

    function tryInitialize(forceRefresh) {
        if (isInitialized && !forceRefresh) {
            return;
        }

        if (!ensureElements()) {
            if (initRetryCount >= MAX_INIT_RETRIES) {
                return;
            }
            initRetryCount += 1;
            window.setTimeout(() => tryInitialize(forceRefresh), INIT_RETRY_DELAY_MS);
            return;
        }

        initRetryCount = 0;

        if (!isInitialized) {
            isInitialized = true;
            bindGlobalListeners();
        }

        setCurrentState(readStoredState());
    }

    function bindGlobalListeners() {
        if (!ensureElements()) {
            return;
        }

        window.addEventListener('storage', (event) => {
            if (event.key !== STORAGE_KEY) {
                return;
            }
            const nextState = parseState(event.newValue);
            setCurrentState(nextState);
        });

        window.addEventListener(EVENT_NAME, (event) => {
            if (ignoreNextEvent) {
                ignoreNextEvent = false;
                return;
            }
            setCurrentState(event.detail ?? readStoredState());
        });

        handleVisibilityGain();
    }

    function handleVisibilityGain() {
        if (!ensureElements()) {
            tryInitialize(false);
            return;
        }
        setCurrentState(readStoredState());
    }

    function ensureElements() {
        if (modal && loadingBar && loadingText && loadingPercentage) {
            return true;
        }

        modal = document.getElementById('generation-progress-modal');
        loadingBar = document.getElementById('loading-bar');
        loadingText = document.getElementById('loading-text');
        loadingPercentage = document.getElementById('loading-percentage');

        return Boolean(modal && loadingBar && loadingText && loadingPercentage);
    }

    function setCurrentState(state) {
        clearTimeout(hideTimeoutId);
        currentState = normalizeState(state);

        if (!currentState) {
            hideModal();
            stopPolling();
            return;
        }

        updateUI(currentState);
        showModal();

        if (shouldAutoHide(currentState)) {
            scheduleAutoHide();
            stopPolling();
        } else if (!isGenerationPage()) {
            startPolling();
        }
    }

    function normalizeState(state) {
        if (!state || typeof state !== 'object') {
            return null;
        }

        const normalized = { ...state };
        if (typeof normalized.progress !== 'number') {
            const parsed = Number(normalized.progress);
            normalized.progress = Number.isFinite(parsed) ? clamp(parsed) : 0;
        } else {
            normalized.progress = clamp(normalized.progress);
        }

        if (typeof normalized.message !== 'string') {
            normalized.message = '';
        }

        if (typeof normalized.status !== 'string') {
            normalized.status = 'pending';
        }

        return normalized;
    }

    function showModal() {
        if (modal.classList.contains('hide')) {
            modal.classList.remove('hide');
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    function hideModal() {
        if (!modal.classList.contains('hide')) {
            modal.classList.add('hide');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    function updateUI(state) {
        const progressValue = clamp(state.progress);
        const roundedProgress = Math.round(progressValue);
        const message = buildProgressMessage(progressValue, state.message);

        if (loadingBar) {
            loadingBar.style.width = `${progressValue}%`;
            loadingBar.setAttribute('aria-valuenow', String(roundedProgress));
        }

        if (loadingPercentage) {
            loadingPercentage.textContent = `${roundedProgress}%`;
        }

        if (loadingText) {
            loadingText.textContent = message;
        }

    }

    function shouldAutoHide(state) {
        if (!state) {
            return true;
        }
        if (state.completed === true) {
            return true;
        }
        const normalizedStatus = normalizeStatus(state.status);
        if (FINAL_STATUSES.has(normalizedStatus)) {
            return true;
        }
        if (Number.isFinite(state.progress) && state.progress >= 100 && normalizedStatus === 'done') {
            return true;
        }
        return false;
    }

    function scheduleAutoHide() {
        hideTimeoutId = window.setTimeout(() => {
            clearStoredState();
            hideModal();
        }, 4000);
    }

    function startPolling() {
        if (!currentState || !currentState.taskId || shouldAutoHide(currentState)) {
            stopPolling();
            return;
        }

        if (pollTimeoutId) {
            return;
        }

        pollTimeoutId = window.setTimeout(async () => {
            pollTimeoutId = null;
            await pollJobStatus();
        }, POLL_INTERVAL_MS);
    }

    async function pollJobStatus() {
        if (!currentState || !currentState.taskId) {
            return;
        }

        try {
            const response = await fetch(AJAX_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                },
                body: new URLSearchParams({
                    action: 'check_image_status',
                    taskId: currentState.taskId,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const payload = await response.json();
            if (!payload.success || !payload.data) {
                throw new Error('Réponse invalide');
            }

            const job = payload.data;
            const remoteStatus = normalizeStatus(job.status);
            const upscaleDone = parseUpscaleDone(job);
            let progress = clamp(job.progress);
            const hasCompleted = hasCompletedUpscales(remoteStatus, upscaleDone);
            const isErrorStatus = remoteStatus === 'error';

            if (hasCompleted && progress < 100) {
                progress = 100;
            }

            let status = 'processing';
            if (isErrorStatus) {
                status = 'error';
            } else if (hasCompleted) {
                status = 'done';
            }

            let nextMessage = currentState && typeof currentState.message === 'string' ? currentState.message : '';
            if (!hasCompleted && !isErrorStatus && progress >= 100) {
                nextMessage = 'Finalisation des variantes HD…';
            } else if (hasCompleted || isErrorStatus) {
                nextMessage = '';
            }

            const nextState = {
                ...currentState,
                jobId: job.jobId ?? currentState.jobId ?? null,
                status,
                progress,
                message: nextMessage,
                upscaleDone,
            };

            if (typeof job.imageUrl === 'string' && job.imageUrl) {
                nextState.imageUrl = job.imageUrl;
            }

            if (shouldAutoHide(nextState)) {
                nextState.completed = true;
            }

            setCurrentState(nextState);
            writeState(nextState);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Impossible de récupérer le statut`, error);
            startPolling();
        }
    }

    function stopPolling() {
        if (pollTimeoutId) {
            clearTimeout(pollTimeoutId);
            pollTimeoutId = null;
        }
    }

    function readStoredState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return parseState(raw);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Lecture impossible du stockage`, error);
            return null;
        }
    }

    function parseState(raw) {
        if (!raw) {
            return null;
        }
        try {
            return JSON.parse(raw);
        } catch (error) {
            console.warn(`${LOG_PREFIX} JSON invalide dans le stockage`, error);
            return null;
        }
    }

    function writeState(state) {
        try {
            if (!state) {
                clearStoredState();
                return;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: Date.now() }));
            ignoreNextEvent = true;
            window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: state }));
        } catch (error) {
            console.warn(`${LOG_PREFIX} Écriture impossible du stockage`, error);
        }
    }

    function clearStoredState() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            ignoreNextEvent = true;
            window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: null }));
        } catch (error) {
            console.warn(`${LOG_PREFIX} Suppression impossible du stockage`, error);
        }
    }

    function normalizeStatus(status) {
        if (typeof status !== 'string') {
            return '';
        }
        return status.trim().toLowerCase();
    }

    function parseUpscaleDone(job) {
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

    function hasCompletedUpscales(status, upscaleDone) {
        if (typeof upscaleDone !== 'number') {
            const parsed = Number(upscaleDone);
            upscaleDone = Number.isFinite(parsed) ? parsed : 0;
        }

        return status === 'done' && upscaleDone >= UPSCALE_TARGET_COUNT;
    }

    function clamp(value) {
        if (!Number.isFinite(value)) {
            return 0;
        }
        if (value < 0) {
            return 0;
        }
        if (value > 100) {
            return 100;
        }
        return value;
    }

    function isGenerationPage() {
        return document.body && document.body.dataset && document.body.dataset.generationPage === '1';
    }

    function buildProgressMessage(progress, customMessage) {
        const rounded = Math.round(progress);
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
})();
