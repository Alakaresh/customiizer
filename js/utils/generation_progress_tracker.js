(function() {
    const STORAGE_KEY = 'customiizerGenerationProgress';
    const EVENT_NAME = 'customiizer:generation-progress-update';
    const LOG_PREFIX = '[Customiizer][ProgressTracker]';
    const AJAX_URL = typeof window.ajaxurl === 'string' ? window.ajaxurl : '/wp-admin/admin-ajax.php';
    const FINAL_STATUSES = new Set(['done', 'error']);

    let modal = null;
    let title = null;
    let loadingBar = null;
    let loadingText = null;
    let currentState = null;
    let pollTimeoutId = null;
    let hideTimeoutId = null;
    let ignoreNextEvent = false;

    document.addEventListener('DOMContentLoaded', initialize);

    function initialize() {
        modal = document.getElementById('generation-progress-modal');
        loadingBar = document.getElementById('loading-bar');
        loadingText = document.getElementById('loading-text');
        title = document.getElementById('generation-progress-title');

        if (!modal || !loadingBar || !loadingText) {
            return;
        }

        setCurrentState(readStoredState());

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
            normalized.message = 'Génération en cours...';
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
        if (loadingBar) {
            loadingBar.style.width = `${state.progress}%`;
        }
        if (loadingText) {
            loadingText.textContent = state.message;
        }
        if (title && state.title) {
            title.textContent = state.title;
        }
    }

    function shouldAutoHide(state) {
        return FINAL_STATUSES.has(state.status) || state.completed === true;
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
        }, 1500);
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
            const progress = clamp(job.progress);
            const status = typeof job.status === 'string' ? job.status : currentState.status;
            const message = buildMessage(status, progress, job);

            const nextState = {
                ...currentState,
                jobId: job.jobId ?? currentState.jobId ?? null,
                status,
                progress,
                message,
            };

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

    function buildMessage(status, progress, job) {
        if (status === 'done') {
            return "Génération terminée !";
        }
        if (status === 'error') {
            return "La génération a échoué.";
        }
        if (typeof job?.progress === 'string' && job.progress.includes('%')) {
            return `Progression : ${job.progress}`;
        }
        if (Number.isFinite(progress)) {
            return `Progression : ${Math.round(progress)}%`;
        }
        return 'Notre IA prépare votre création...';
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
})();
