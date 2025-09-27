(function(window, document) {
    'use strict';

    const LOG_PREFIX = '[Customiizer][GenerationTracker]';
    const ACTIVE_KEY = 'customiizerActiveGeneration';
    const STATUS_KEY = 'customiizerGenerationStatus';
    const GENERATION_ACTIVE_EVENT = 'customiizer:generation-active';
    const GENERATION_STATUS_EVENT = 'customiizer:generation-status';
    const GENERATION_COMPLETE_EVENT = 'customiizer:generation-complete';
    const MODAL_ID = 'generation-tracker-modal';
    const POLL_INTERVAL = 5000;

    let pollTimeoutId = null;
    let autoHideTimeoutId = null;
    let websocketConnected = false;
    let pollInProgress = false;
    let lastPollTimestamp = 0;
    const MIN_SOCKET_REFRESH_INTERVAL = 1000;

    function parseJSON(value) {
        if (!value) {
            return null;
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Impossible de parser la valeur JSON`, error);
            return null;
        }
    }

    function getActiveJob() {
        try {
            if (!window.localStorage) {
                return null;
            }

            const raw = window.localStorage.getItem(ACTIVE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn(`${LOG_PREFIX} Lecture de la génération active impossible`, error);
            return null;
        }
    }

    function getStoredStatus() {
        try {
            if (!window.localStorage) {
                return null;
            }

            const raw = window.localStorage.getItem(STATUS_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn(`${LOG_PREFIX} Lecture du statut de génération impossible`, error);
            return null;
        }
    }

    function clearStoredJob() {
        try {
            if (window.localStorage) {
                window.localStorage.removeItem(ACTIVE_KEY);
                window.localStorage.removeItem(STATUS_KEY);
            }
        } catch (error) {
            console.warn(`${LOG_PREFIX} Impossible de supprimer la génération stockée`, error);
        }
    }

    function ensureModal() {
        const modal = document.getElementById(MODAL_ID);
        if (modal) {
            modal.classList.add('is-visible');
        }
        return modal;
    }

    function hideModal() {
        const modal = document.getElementById(MODAL_ID);
        if (modal) {
            modal.classList.remove('is-visible');
        }
    }

    function broadcastEvent(name, detail) {
        try {
            window.dispatchEvent(new CustomEvent(name, { detail }));
        } catch (error) {
            console.warn(`${LOG_PREFIX} Impossible d'émettre l'événement ${name}`, error);
        }
    }

    function scheduleAutoHide(statusPayload, delay) {
        if (autoHideTimeoutId) {
            window.clearTimeout(autoHideTimeoutId);
        }

        autoHideTimeoutId = window.setTimeout(() => {
            autoHideTimeoutId = null;
            clearStoredJob();
            hideModal();
        }, Math.max(0, delay));
    }

    function stopPolling() {
        if (pollTimeoutId) {
            window.clearTimeout(pollTimeoutId);
            pollTimeoutId = null;
        }
    }

    function scheduleNextPoll(delay = POLL_INTERVAL) {
        stopPolling();
        const hasDefaultDelay = arguments.length === 0;
        const baseDelay = typeof delay === 'number' ? delay : POLL_INTERVAL;
        const effectiveDelay = hasDefaultDelay && websocketConnected
            ? baseDelay * 3
            : baseDelay;
        pollTimeoutId = window.setTimeout(pollActiveJob, effectiveDelay);
    }

    function sanitizeProgress(progress) {
        if (typeof progress === 'number') {
            return Math.max(0, Math.min(100, Math.round(progress)));
        }

        if (typeof progress === 'string') {
            const parsed = parseInt(progress, 10);
            return Number.isNaN(parsed) ? null : Math.max(0, Math.min(100, parsed));
        }

        return null;
    }

    function updateModal(status) {
        if (!status) {
            hideModal();
            return;
        }

        const modal = ensureModal();
        if (!modal) {
            return;
        }

        const statusTextEl = modal.querySelector('[data-generation-status]');
        const badgeEl = modal.querySelector('[data-generation-status-badge]');
        const progressBarEl = modal.querySelector('[data-generation-progress-bar]');
        const progressValueEl = modal.querySelector('[data-generation-progress-value]');
        const promptWrapper = modal.querySelector('[data-generation-prompt-wrapper]');
        const promptEl = modal.querySelector('[data-generation-prompt]');
        const previewWrapper = modal.querySelector('[data-generation-preview]');
        const previewImage = previewWrapper ? previewWrapper.querySelector('img') : null;

        if (statusTextEl) {
            statusTextEl.textContent = status.message || 'Génération en cours...';
        }

        if (badgeEl) {
            badgeEl.textContent = (status.status || 'en cours').toUpperCase();
        }

        if (progressBarEl) {
            const progress = sanitizeProgress(status.progress);
            if (progress !== null) {
                progressBarEl.style.width = `${progress}%`;
                progressBarEl.setAttribute('aria-valuenow', progress);
                if (progressValueEl) {
                    progressValueEl.textContent = `${progress}%`;
                }
            } else {
                progressBarEl.style.width = '15%';
                progressBarEl.setAttribute('aria-valuenow', 15);
                if (progressValueEl) {
                    progressValueEl.textContent = '...';
                }
            }
        }

        if (promptEl && promptWrapper) {
            if (status.prompt) {
                promptEl.textContent = status.prompt;
                promptWrapper.classList.remove('is-hidden');
            } else {
                promptEl.textContent = '';
                promptWrapper.classList.add('is-hidden');
            }
        }

        if (previewWrapper && previewImage) {
            if (status.previewUrl) {
                previewWrapper.classList.remove('is-hidden');
                previewImage.src = status.previewUrl;
                previewImage.alt = status.prompt ? `Aperçu - ${status.prompt}` : 'Aperçu de la génération';
            } else {
                previewWrapper.classList.add('is-hidden');
                previewImage.removeAttribute('src');
                previewImage.alt = '';
            }
        }
    }

    function shouldContinuePolling(status) {
        if (!status || !status.status) {
            return true;
        }

        const normalized = status.status.toLowerCase();
        return normalized !== 'done' && normalized !== 'error';
    }

    function isEventForActiveJob(payload) {
        const activeJob = getActiveJob();
        if (!activeJob || (!activeJob.taskId && !activeJob.jobId)) {
            return false;
        }

        if (!payload || typeof payload !== 'object') {
            return true;
        }

        if (payload.jobId && activeJob.jobId && parseInt(payload.jobId, 10) === parseInt(activeJob.jobId, 10)) {
            return true;
        }

        const hash = payload.taskId || payload.mjHash || payload.hash;
        if (hash && activeJob.taskId && hash === activeJob.taskId) {
            return true;
        }

        return false;
    }

    async function pollActiveJob() {
        const activeJob = getActiveJob();
        if (!activeJob || !activeJob.taskId) {
            stopPolling();
            hideModal();
            return;
        }

        if (pollInProgress) {
            return;
        }

        pollInProgress = true;

        if (typeof window.ajaxurl === 'undefined') {
            console.warn(`${LOG_PREFIX} ajaxurl indisponible. Impossible de suivre la génération.`);
            pollInProgress = false;
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
                    taskId: activeJob.taskId,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const payload = await response.json();
            if (!payload.success) {
                throw new Error(payload.data && payload.data.message ? payload.data.message : 'Statut indisponible');
            }

            const job = payload.data || {};
            const statusPayload = {
                taskId: job.taskId || activeJob.taskId,
                jobId: job.jobId || activeJob.jobId || null,
                status: job.status || '',
                progress: sanitizeProgress(job.progress),
                message: job.progressMessage || job.message || '',
                previewUrl: job.previewUrl || '',
                prompt: job.prompt || '',
                updatedAt: job.progressUpdatedAt || job.updatedAt || new Date().toISOString(),
            };

            if (!statusPayload.message && statusPayload.status === 'processing') {
                statusPayload.message = 'Notre IA travaille sur votre création...';
            }

            try {
                if (window.localStorage) {
                    window.localStorage.setItem(STATUS_KEY, JSON.stringify(statusPayload));
                }
            } catch (storageError) {
                console.warn(`${LOG_PREFIX} Impossible de stocker le statut`, storageError);
            }

            updateModal(statusPayload);

            if (shouldContinuePolling(job)) {
                scheduleNextPoll();
            } else {
                stopPolling();
                broadcastEvent(GENERATION_COMPLETE_EVENT, statusPayload);
            }
        } catch (error) {
            console.error(`${LOG_PREFIX} Erreur lors du suivi du job`, error);
            scheduleNextPoll(websocketConnected ? POLL_INTERVAL : POLL_INTERVAL * 2);
        } finally {
            pollInProgress = false;
            lastPollTimestamp = Date.now();
        }
    }

    function handleActiveJobChange(job) {
        if (job && job.taskId) {
            if (autoHideTimeoutId) {
                window.clearTimeout(autoHideTimeoutId);
                autoHideTimeoutId = null;
            }

            const status = getStoredStatus();
            updateModal(status || {
                taskId: job.taskId,
                status: 'processing',
                progress: null,
                message: 'Préparation de votre image...'
            });
            pollActiveJob();
        } else {
            stopPolling();
            hideModal();
        }
    }

    function initialiseTracker() {
        const activeJob = getActiveJob();
        const storedStatus = getStoredStatus();

        if (activeJob && activeJob.taskId) {
            updateModal(storedStatus || {
                taskId: activeJob.taskId,
                status: 'processing',
                progress: null,
                message: 'Préparation de votre image...'
            });
            pollActiveJob();
        } else {
            hideModal();
        }
    }

    document.addEventListener('DOMContentLoaded', initialiseTracker);

    window.addEventListener('customiizer:generation-socket-status', (event) => {
        const detail = event && event.detail ? event.detail : {};
        websocketConnected = !!detail.connected;

        if (!websocketConnected) {
            scheduleNextPoll();
        }
    });

    window.addEventListener('customiizer:generation-refresh-request', (event) => {
        const payload = event && event.detail ? event.detail.payload : null;

        if (!isEventForActiveJob(payload)) {
            return;
        }

        const now = Date.now();
        if (pollInProgress || (now - lastPollTimestamp) < MIN_SOCKET_REFRESH_INTERVAL) {
            return;
        }

        pollActiveJob();
    });

    window.addEventListener('storage', (event) => {
        if (event.key === ACTIVE_KEY) {
            handleActiveJobChange(event.newValue ? parseJSON(event.newValue) : null);
        } else if (event.key === STATUS_KEY && event.newValue) {
            updateModal(parseJSON(event.newValue));
        }
    });

    window.addEventListener(GENERATION_ACTIVE_EVENT, (event) => {
        handleActiveJobChange(event.detail || null);
    });

    window.addEventListener(GENERATION_STATUS_EVENT, (event) => {
        if (event.detail) {
            updateModal(event.detail);
        }
    });

    window.addEventListener(GENERATION_COMPLETE_EVENT, (event) => {
        if (event && event.detail) {
            scheduleAutoHide(event.detail, 4000);
        } else {
            scheduleAutoHide({}, 4000);
        }
    });
})(window, document);
