(function(window) {
    'use strict';

    const LOG_PREFIX = '[Customiizer][GenerationSocket]';
    const ACTIVE_KEY = 'customiizerActiveGeneration';
    const ACTIVE_EVENT = 'customiizer:generation-active';
    const COMPLETE_EVENT = 'customiizer:generation-complete';
    const SOCKET_STATUS_EVENT = 'customiizer:generation-socket-status';
    const REFRESH_REQUEST_EVENT = 'customiizer:generation-refresh-request';

    const workerConfig = Object.assign(
        {
            websocketUrl: null,
            websocketEnabled: true,
            reconnectDelay: 4000,
            idleCloseDelay: 10000,
        },
        window.customiizerWorker || {}
    );

    const websocketUrl = typeof workerConfig.websocketUrl === 'string' && workerConfig.websocketUrl !== ''
        ? workerConfig.websocketUrl
        : null;
    const reconnectDelay = typeof workerConfig.reconnectDelay === 'number'
        ? Math.max(1000, workerConfig.reconnectDelay)
        : 4000;
    const idleCloseDelay = typeof workerConfig.idleCloseDelay === 'number'
        ? Math.max(0, workerConfig.idleCloseDelay)
        : 10000;

    if (!websocketUrl || workerConfig.websocketEnabled === false || !('WebSocket' in window)) {
        broadcastSocketStatus(false, websocketUrl ? 'unsupported' : 'disabled');
        return;
    }

    let socket = null;
    let reconnectTimer = null;
    let idleCloseTimer = null;
    let manualClose = false;
    let activeJob = null;
    let lastMessageSignature = null;

    function log(...args) {
        try {
            console.debug(LOG_PREFIX, ...args);
        } catch (error) {
            // Silence logging failures.
        }
    }

    function broadcastSocketStatus(connected, reason) {
        try {
            window.dispatchEvent(new CustomEvent(SOCKET_STATUS_EVENT, {
                detail: {
                    connected,
                    url: websocketUrl,
                    reason: reason || null,
                    timestamp: Date.now(),
                },
            }));
        } catch (error) {
            log('Unable to broadcast socket status', error);
        }
    }

    function getStoredActiveJob() {
        try {
            if (!window.localStorage) {
                return null;
            }

            const raw = window.localStorage.getItem(ACTIVE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            log('Unable to read active job from storage', error);
            return null;
        }
    }

    function normaliseJob(data) {
        if (!data || typeof data !== 'object') {
            return null;
        }

        const normalised = {};
        if (data.taskId) {
            normalised.taskId = String(data.taskId);
        } else if (data.task_id) {
            normalised.taskId = String(data.task_id);
        } else if (data.hash) {
            normalised.taskId = String(data.hash);
        }

        if (data.jobId || data.job_id || data.id) {
            const jobValue = data.jobId || data.job_id || data.id;
            const parsed = parseInt(jobValue, 10);
            if (!Number.isNaN(parsed)) {
                normalised.jobId = String(parsed);
            } else if (jobValue) {
                normalised.jobId = String(jobValue);
            }
        }

        return (normalised.taskId || normalised.jobId) ? normalised : null;
    }

    function setActiveJob(job) {
        const normalised = normaliseJob(job);
        if (!normalised) {
            activeJob = null;
            lastMessageSignature = null;
            scheduleIdleClose();
            return;
        }

        const hasChanged = !activeJob
            || activeJob.taskId !== normalised.taskId
            || activeJob.jobId !== normalised.jobId;

        activeJob = normalised;

        if (hasChanged) {
            lastMessageSignature = null;
            cancelIdleClose();
            ensureSocket();
        }
    }

    function cancelIdleClose() {
        if (idleCloseTimer) {
            window.clearTimeout(idleCloseTimer);
            idleCloseTimer = null;
        }
    }

    function scheduleIdleClose() {
        cancelIdleClose();

        if (idleCloseDelay === 0) {
            closeSocket(true);
            return;
        }

        idleCloseTimer = window.setTimeout(() => {
            idleCloseTimer = null;
            closeSocket(true);
        }, idleCloseDelay);
    }

    function ensureSocket() {
        if (!activeJob) {
            scheduleIdleClose();
            return;
        }

        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        cancelReconnect();

        try {
            socket = new WebSocket(websocketUrl);
        } catch (error) {
            log('Failed to create WebSocket connection', error);
            broadcastSocketStatus(false, 'error');
            scheduleReconnect();
            return;
        }

        manualClose = false;

        socket.addEventListener('open', () => {
            log('WebSocket connected');
            broadcastSocketStatus(true, 'open');
        });

        socket.addEventListener('message', (event) => {
            handleMessage(event.data);
        });

        socket.addEventListener('error', (event) => {
            log('WebSocket error', event);
        });

        socket.addEventListener('close', (event) => {
            log('WebSocket closed', event);
            socket = null;
            broadcastSocketStatus(false, 'close');

            if (!manualClose && activeJob) {
                scheduleReconnect();
            }
        });
    }

    function scheduleReconnect() {
        if (reconnectTimer) {
            return;
        }

        reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            ensureSocket();
        }, reconnectDelay);
    }

    function cancelReconnect() {
        if (reconnectTimer) {
            window.clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    }

    function closeSocket(forceManual) {
        cancelReconnect();
        if (socket) {
            manualClose = !!forceManual;
            try {
                socket.close();
            } catch (error) {
                log('Error while closing socket', error);
            }
            socket = null;
        }
        broadcastSocketStatus(false, 'closed');
    }

    function matchesActiveJob(payload) {
        if (!activeJob) {
            return false;
        }

        const payloadJob = normaliseJob(payload);
        if (!payloadJob) {
            return false;
        }

        if (activeJob.jobId && payloadJob.jobId && activeJob.jobId === payloadJob.jobId) {
            return true;
        }

        if (activeJob.taskId && payloadJob.taskId && activeJob.taskId === payloadJob.taskId) {
            return true;
        }

        return false;
    }

    function handleMessage(rawData) {
        if (!rawData) {
            return;
        }

        let payload = null;
        try {
            payload = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        } catch (error) {
            log('Failed to parse WebSocket payload', error, rawData);
            return;
        }

        if (!payload || typeof payload !== 'object') {
            return;
        }

        if (!matchesActiveJob(payload)) {
            return;
        }

        const signature = JSON.stringify({
            event: payload.event || null,
            progress: typeof payload.progress === 'number' ? payload.progress : payload.progress || null,
            jobId: payload.jobId || payload.job_id || payload.id || null,
            hash: payload.taskId || payload.mjHash || payload.hash || null,
        });

        if (signature === lastMessageSignature) {
            return;
        }

        lastMessageSignature = signature;

        try {
            window.dispatchEvent(new CustomEvent(REFRESH_REQUEST_EVENT, {
                detail: {
                    payload,
                    timestamp: Date.now(),
                },
            }));
        } catch (error) {
            log('Unable to dispatch refresh request', error);
        }
    }

    function handleStorageEvent(event) {
        if (event.key !== ACTIVE_KEY) {
            return;
        }

        if (event.newValue) {
            try {
                setActiveJob(JSON.parse(event.newValue));
            } catch (error) {
                log('Unable to parse storage job', error);
            }
        } else {
            setActiveJob(null);
        }
    }

    const initialJob = getStoredActiveJob();
    if (initialJob) {
        setActiveJob(initialJob);
    } else {
        scheduleIdleClose();
    }

    window.addEventListener('storage', handleStorageEvent);

    window.addEventListener(ACTIVE_EVENT, (event) => {
        setActiveJob(event.detail || null);
    });

    window.addEventListener(COMPLETE_EVENT, () => {
        setActiveJob(null);
    });
})(window);
