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
    const SOCKET_CONFIG = sanitizeSocketConfig(window.customiizerWorkerSocket);
    const SOCKET_RETRY_INITIAL_MS = 2000;
    const SOCKET_RETRY_MAX_MS = 30000;
    const SOCKET_BACKGROUND_THRESHOLD_MS = 60000;
    const SOCKET_BACKGROUND_SUSPEND_MS = 120000;

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
    let socket = null;
    let socketShouldReconnect = false;
    let socketReconnectDelay = SOCKET_RETRY_INITIAL_MS;
    let socketReconnectTimer = null;
    let socketSuspendedUntil = 0;
    let lastVisibilityHiddenAt = null;
    let realtimeAvailable = Boolean(SOCKET_CONFIG.enabled && SOCKET_CONFIG.url);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => tryInitialize(false));
    } else {
        tryInitialize(false);
    }

    window.addEventListener('pageshow', () => tryInitialize(true));
    window.addEventListener('focus', handleVisibilityGain);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            handleVisibilityLoss();
        } else {
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
        if (lastVisibilityHiddenAt !== null) {
            const hiddenDuration = Date.now() - lastVisibilityHiddenAt;
            lastVisibilityHiddenAt = null;
            if (hiddenDuration > SOCKET_BACKGROUND_THRESHOLD_MS) {
                socketSuspendedUntil = Date.now() + SOCKET_BACKGROUND_SUSPEND_MS;
            }
        }

        if (!ensureElements()) {
            tryInitialize(false);
            return;
        }
        setCurrentState(readStoredState());
    }

    function handleVisibilityLoss() {
        lastVisibilityHiddenAt = Date.now();
        stopSocket();
        if (!isGenerationPage()) {
            startPolling();
        }
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
            stopSocket();
            return;
        }

        updateUI(currentState);
        showModal();

        if (shouldAutoHide(currentState)) {
            scheduleAutoHide();
            stopPolling();
            stopSocket();
            return;
        }

        if (shouldUseRealtime(currentState)) {
            stopPolling();
            ensureSocketConnection();
            return;
        }

        stopSocket();

        if (!isGenerationPage()) {
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

    function shouldUseRealtime(state) {
        if (!realtimeAvailable) {
            return false;
        }

        if (!state || typeof state !== 'object') {
            return false;
        }

        if (!state.taskId) {
            return false;
        }

        if (shouldAutoHide(state)) {
            return false;
        }

        if (typeof window.WebSocket !== 'function') {
            realtimeAvailable = false;
            return false;
        }

        if (!SOCKET_CONFIG.enabled || !SOCKET_CONFIG.url) {
            realtimeAvailable = false;
            return false;
        }

        if (Date.now() < socketSuspendedUntil) {
            return false;
        }

        if (document.hidden) {
            return false;
        }

        return true;
    }

    function ensureSocketConnection() {
        if (!shouldUseRealtime(currentState)) {
            return;
        }

        socketShouldReconnect = true;

        if (socket || socketReconnectTimer) {
            return;
        }

        openSocketConnection();
    }

    function openSocketConnection() {
        if (!shouldUseRealtime(currentState)) {
            return;
        }

        if (typeof window.WebSocket !== 'function') {
            realtimeAvailable = false;
            return;
        }

        const socketUrl = buildSocketUrl();

        if (!socketUrl) {
            realtimeAvailable = false;
            return;
        }

        try {
            socket = new WebSocket(socketUrl);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Impossible d'ouvrir la connexion WebSocket`, error);
            handleSocketFailure();
            return;
        }

        socket.addEventListener('open', handleSocketOpen);
        socket.addEventListener('message', handleSocketMessage);
        socket.addEventListener('error', handleSocketError);
        socket.addEventListener('close', handleSocketClose);
    }

    function handleSocketOpen() {
        socketReconnectDelay = SOCKET_RETRY_INITIAL_MS;
    }

    function handleSocketError(event) {
        console.warn(`${LOG_PREFIX} Erreur de connexion WebSocket`, event);
    }

    function handleSocketClose() {
        socket = null;

        if (!socketShouldReconnect) {
            return;
        }

        handleSocketFailure();
    }

    function handleSocketFailure() {
        if (!socketShouldReconnect) {
            return;
        }

        stopSocket(false);

        if (!socketReconnectTimer) {
            socketReconnectTimer = window.setTimeout(() => {
                socketReconnectTimer = null;
                if (shouldUseRealtime(currentState)) {
                    openSocketConnection();
                }
            }, socketReconnectDelay);

            socketReconnectDelay = Math.min(socketReconnectDelay * 2, SOCKET_RETRY_MAX_MS);
        }

        if (!isGenerationPage()) {
            startPolling();
        }
    }

    function stopSocket(shouldDisableReconnect = true) {
        if (shouldDisableReconnect) {
            socketShouldReconnect = false;
        }

        if (socketReconnectTimer) {
            clearTimeout(socketReconnectTimer);
            socketReconnectTimer = null;
        }

        if (socket) {
            try {
                socket.close();
            } catch (error) {
                console.warn(`${LOG_PREFIX} Erreur lors de la fermeture du WebSocket`, error);
            }

            socket.removeEventListener('open', handleSocketOpen);
            socket.removeEventListener('message', handleSocketMessage);
            socket.removeEventListener('error', handleSocketError);
            socket.removeEventListener('close', handleSocketClose);
            socket = null;
        }
    }

    function handleSocketMessage(event) {
        if (!event || typeof event.data !== 'string') {
            return;
        }

        let payload;
        try {
            payload = JSON.parse(event.data);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Message WebSocket invalide`, error);
            return;
        }

        if (!payload || typeof payload !== 'object') {
            return;
        }

        const jobPayload = normalizeSocketPayload(payload);

        if (!jobPayload) {
            return;
        }

        if (!matchesActiveJob(jobPayload)) {
            return;
        }

        const nextState = deriveStateFromSocketPayload(jobPayload);
        if (!nextState) {
            return;
        }

        setCurrentState(nextState);
        writeState(nextState);
    }

    function matchesActiveJob(payload) {
        if (!currentState) {
            return false;
        }

        const activeTaskId = extractString(currentState.taskId);
        const activeJobId = extractString(currentState.jobId);
        const payloadTaskId = extractString(payload.taskId ?? payload.task_id ?? payload.TaskId);
        const payloadJobId = extractString(payload.jobId ?? payload.job_id ?? payload.JobId);

        if (activeTaskId && payloadTaskId && payloadTaskId !== activeTaskId) {
            return false;
        }

        if (activeJobId && payloadJobId && payloadJobId !== activeJobId) {
            return false;
        }

        if (activeTaskId) {
            return !payloadTaskId || payloadTaskId === activeTaskId;
        }

        if (activeJobId) {
            return Boolean(payloadJobId) && payloadJobId === activeJobId;
        }

        return false;
    }

    function deriveStateFromSocketPayload(payload) {
        if (!currentState) {
            return null;
        }

        const nextState = { ...currentState };

        const payloadTaskId = extractString(payload.taskId ?? payload.task_id ?? payload.TaskId);
        if (payloadTaskId) {
            nextState.taskId = payloadTaskId;
        }

        const payloadJobId = extractString(payload.jobId ?? payload.job_id ?? payload.JobId);
        if (payloadJobId) {
            nextState.jobId = payloadJobId;
        }

        if (Object.prototype.hasOwnProperty.call(payload, 'progress')) {
            const parsedProgress = Number(payload.progress);
            if (Number.isFinite(parsedProgress)) {
                nextState.progress = clamp(parsedProgress);
            }
        }

        const rawStatus = payload.status ?? payload.Status;
        let remoteStatus = normalizeStatus(rawStatus ?? nextState.status);
        const upscaleDone = parseUpscaleDone(payload);
        const hasCompleted = hasCompletedUpscales(remoteStatus, upscaleDone);
        const isErrorStatus = remoteStatus === 'error';

        if (hasCompleted && Number.isFinite(nextState.progress) && nextState.progress < 100) {
            nextState.progress = 100;
        }

        if (isErrorStatus) {
            nextState.status = 'error';
        } else if (hasCompleted) {
            nextState.status = 'done';
        } else if (remoteStatus) {
            nextState.status = remoteStatus;
        } else {
            nextState.status = 'processing';
        }

        if (Number.isFinite(upscaleDone)) {
            nextState.upscaleDone = upscaleDone;
        }

        if (Object.prototype.hasOwnProperty.call(payload, 'message')) {
            nextState.message = typeof payload.message === 'string' ? payload.message : '';
        }

        const livePreviewUrl = extractString(payload.imageUrl ?? payload.image_url ?? payload.preview_url);
        if (livePreviewUrl) {
            nextState.imageUrl = livePreviewUrl;
        }

        if (payload.completed === true) {
            nextState.completed = true;
        }

        const shouldShowFinalMessage = !hasCompleted && !isErrorStatus && Number.isFinite(nextState.progress) && nextState.progress >= 100;
        if (shouldShowFinalMessage) {
            nextState.message = 'Finalisation des variantes HD…';
        }

        if (hasCompleted || isErrorStatus) {
            nextState.message = '';
        }

        if (shouldAutoHide(nextState)) {
            nextState.completed = true;
        }

        return nextState;
    }

    function buildSocketUrl() {
        if (!SOCKET_CONFIG || !SOCKET_CONFIG.enabled || !SOCKET_CONFIG.url) {
            return '';
        }

        let baseUrl = extractString(SOCKET_CONFIG.url);
        if (!baseUrl) {
            return '';
        }

        if (/^https?:\/\//i.test(baseUrl)) {
            baseUrl = baseUrl.replace(/^http/i, 'ws');
        } else if (!/^wss?:\/\//i.test(baseUrl)) {
            const { protocol, host } = window.location;
            const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
            const normalizedPath = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
            baseUrl = `${wsProtocol}//${host}${normalizedPath}`;
        }

        if (SOCKET_CONFIG.token) {
            const separator = baseUrl.includes('?') ? '&' : '?';
            baseUrl += `${separator}token=${encodeURIComponent(SOCKET_CONFIG.token)}`;
        }

        return baseUrl;
    }

    function extractString(value) {
        if (typeof value === 'string') {
            return value.trim();
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            return String(value);
        }
        return '';
    }

    function sanitizeSocketConfig(rawConfig) {
        const safeConfig = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
        const enabledValue = safeConfig.enabled ?? safeConfig.active ?? safeConfig.isEnabled ?? safeConfig.is_active ?? false;
        const urlValue = safeConfig.url ?? safeConfig.endpoint ?? '';
        const tokenValue = safeConfig.token ?? safeConfig.authToken ?? safeConfig.secret ?? '';

        return {
            enabled: normalizeBoolean(enabledValue),
            url: extractString(urlValue),
            token: typeof tokenValue === 'string' ? tokenValue : '',
        };
    }

    function normalizeSocketPayload(payload) {
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        if (payload.data && typeof payload.data === 'object') {
            return payload.data;
        }

        if (payload.payload && typeof payload.payload === 'object') {
            return payload.payload;
        }

        return payload;
    }

    function normalizeBoolean(value) {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'number') {
            return value === 1;
        }
        if (typeof value === 'string') {
            const lowered = value.trim().toLowerCase();
            if (!lowered) {
                return false;
            }
            return ['1', 'true', 'yes', 'on', 'enabled'].includes(lowered);
        }
        return Boolean(value);
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
