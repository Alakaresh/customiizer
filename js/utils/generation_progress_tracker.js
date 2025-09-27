(function() {
    const STORAGE_KEY = 'customiizerGenerationProgress';
    const EVENT_NAME = 'customiizer:generation-progress-update';
    const LOG_PREFIX = '[Customiizer][ProgressTracker]';
    const FINAL_STATUSES = new Set(['done', 'error']);

    let modal = null;
    let title = null;
    let loadingBar = null;
    let loadingText = null;
    let hideTimeoutId = null;
    let ignoreNextEvent = false;
    let previewContainer = null;
    let previewImage = null;

    document.addEventListener('DOMContentLoaded', initialize);

    function initialize() {
        modal = document.getElementById('generation-progress-modal');
        loadingBar = document.getElementById('loading-bar');
        loadingText = document.getElementById('loading-text');
        title = document.getElementById('generation-progress-title');
        previewContainer = document.getElementById('generation-progress-preview');
        previewImage = document.getElementById('generation-progress-preview-image');

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
        const currentState = normalizeState(state);

        if (!currentState) {
            clearPreview();
            hideModal();
            return;
        }

        updateUI(currentState);
        showModal();

        if (shouldAutoHide(currentState)) {
            scheduleAutoHide();
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

        if (typeof normalized.previewUrl === 'string') {
            normalized.previewUrl = normalized.previewUrl.trim();
        } else {
            normalized.previewUrl = '';
        }

        if (Array.isArray(normalized.previewHistory)) {
            normalized.previewHistory = normalized.previewHistory
                .map(sanitizePreviewHistoryEntry)
                .filter(Boolean);
        } else {
            normalized.previewHistory = [];
        }

        if (!normalized.previewUrl && normalized.previewHistory.length) {
            const latestEntry = normalized.previewHistory[normalized.previewHistory.length - 1];
            if (latestEntry && typeof latestEntry.url === 'string') {
                normalized.previewUrl = latestEntry.url;
            }
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

        updatePreview(state);
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

    function sanitizePreviewHistoryEntry(entry) {
        if (!entry || typeof entry !== 'object') {
            return null;
        }

        const url = typeof entry.url === 'string' ? entry.url.trim() : '';
        if (!url) {
            return null;
        }

        const normalized = { url };

        if (typeof entry.progress === 'number') {
            normalized.progress = clamp(entry.progress);
        } else if (typeof entry.progress === 'string') {
            const parsed = Number(entry.progress);
            if (Number.isFinite(parsed)) {
                normalized.progress = clamp(parsed);
            }
        }

        if (typeof entry.timestamp === 'number' && Number.isFinite(entry.timestamp)) {
            normalized.timestamp = entry.timestamp;
        }

        return normalized;
    }

    function updatePreview(state) {
        if (!previewContainer || !previewImage) {
            return;
        }

        const history = Array.isArray(state.previewHistory) ? state.previewHistory : [];
        let resolvedUrl = typeof state.previewUrl === 'string' ? state.previewUrl.trim() : '';

        if (!resolvedUrl && history.length) {
            for (let index = history.length - 1; index >= 0; index -= 1) {
                const entry = history[index];
                if (entry && typeof entry.url === 'string' && entry.url) {
                    resolvedUrl = entry.url;
                    break;
                }
            }
        }

        if (!resolvedUrl) {
            clearPreview();
            return;
        }

        previewImage.src = resolvedUrl;
        previewImage.alt = typeof state.previewAlt === 'string' && state.previewAlt
            ? state.previewAlt
            : 'Aperçu de la génération en cours';
        previewContainer.classList.remove('hide');
        previewContainer.setAttribute('aria-hidden', 'false');
    }

    function clearPreview() {
        if (!previewContainer || !previewImage) {
            return;
        }

        previewContainer.classList.add('hide');
        previewContainer.setAttribute('aria-hidden', 'true');
        previewImage.removeAttribute('src');
        previewImage.alt = 'Aperçu de la génération en cours';
    }
})();
