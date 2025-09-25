(function(window, document) {
    'use strict';

    if (window.CustomiizerBackgroundGeneration) {
        return;
    }

    const LOG_PREFIX = '[Customiizer][BackgroundGeneration]';
    const STORAGE_KEY = 'customiizer_active_generation';
    const DEFAULT_POLL_INTERVAL = 1500;
    const UPSCALE_CHECK_INTERVAL = 1500;
    const UPSCALE_MAX_CHECKS = 60;

    const listeners = new Set();
    let job = null;
    let pollTimeout = null;
    let upscaleInterval = null;

    function log(message, context) {
        if (context) {
            console.log(`${LOG_PREFIX} ${message}`, context);
        } else {
            console.log(`${LOG_PREFIX} ${message}`);
        }
    }

    function warn(message, context) {
        if (context) {
            console.warn(`${LOG_PREFIX} ${message}`, context);
        } else {
            console.warn(`${LOG_PREFIX} ${message}`);
        }
    }

    function error(message, context) {
        if (context) {
            console.error(`${LOG_PREFIX} ${message}`, context);
        } else {
            console.error(`${LOG_PREFIX} ${message}`);
        }
    }

    function persistJob() {
        if (!job) {
            localStorage.removeItem(STORAGE_KEY);
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(job));
        } catch (storageError) {
            error('Impossible de sauvegarder la tâche en localStorage', storageError);
        }
    }

    function loadStoredJob() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.hash) {
                return null;
            }
            return parsed;
        } catch (storageError) {
            error('Impossible de lire la tâche depuis localStorage', storageError);
            return null;
        }
    }

    function notify(type, payload = {}) {
        listeners.forEach(listener => {
            try {
                listener({ type, job: job ? { ...job } : null, payload });
            } catch (listenerError) {
                error('Erreur lors de la notification d\'un listener', listenerError);
            }
        });
    }

    function setJob(nextJob) {
        job = nextJob;
        persistJob();
    }

    function updateJob(partial, eventType, payload) {
        if (!job) {
            return;
        }
        job = { ...job, ...partial };
        persistJob();
        if (eventType) {
            notify(eventType, payload);
        }
    }

    function clearJob() {
        if (pollTimeout) {
            clearTimeout(pollTimeout);
            pollTimeout = null;
        }
        if (upscaleInterval) {
            clearInterval(upscaleInterval);
            upscaleInterval = null;
        }
        job = null;
        persistJob();
        updateToast({ progress: 0 });
        notify('job-cleared', {});
    }

    function createToast() {
        const existing = document.querySelector('.background-generation-toast');
        if (existing) {
            return existing;
        }

        const toast = document.createElement('div');
        toast.className = 'background-generation-toast';
        toast.setAttribute('aria-live', 'polite');
        toast.innerHTML = `
            <div class="background-generation-toast__content">
                <div class="background-generation-toast__title">Génération en cours</div>
                <p class="background-generation-toast__subtitle">Vous pouvez continuer à naviguer, nous vous prévenons quand c'est prêt.</p>
                <div class="background-generation-toast__progress" role="status">
                    <div class="background-generation-toast__progress-bar">
                        <span class="background-generation-toast__progress-fill" style="width:0%"></span>
                    </div>
                    <span class="background-generation-toast__progress-text">0%</span>
                </div>
                <div class="background-generation-toast__actions">
                    <a class="background-generation-toast__link" href="/customiize">Voir la génération</a>
                    <button type="button" class="background-generation-toast__close" aria-label="Masquer le suivi">✕</button>
                </div>
            </div>
        `;

        const closeButton = toast.querySelector('.background-generation-toast__close');
        closeButton.addEventListener('click', () => {
            toast.classList.remove('is-visible');
        });

        document.body.appendChild(toast);
        return toast;
    }

    function updateToast(status) {
        const toast = createToast();
        if (!job) {
            toast.classList.remove('is-visible');
            return;
        }

        const title = toast.querySelector('.background-generation-toast__title');
        const subtitle = toast.querySelector('.background-generation-toast__subtitle');
        const bar = toast.querySelector('.background-generation-toast__progress-fill');
        const text = toast.querySelector('.background-generation-toast__progress-text');
        const link = toast.querySelector('.background-generation-toast__link');

        toast.classList.add('is-visible');

        const percent = Math.min(100, Math.max(0, Math.round(status.progress || 0)));
        bar.style.width = `${percent}%`;
        text.textContent = `${percent}%`;

        switch (job.stage) {
            case 'generation':
                title.textContent = 'Génération en cours';
                subtitle.textContent = "Nous créons vos images, restez zen !";
                break;
            case 'upscaling':
                title.textContent = 'Amélioration des images';
                subtitle.textContent = "Les détails se peaufinnent...";
                break;
            case 'waiting-upscales':
                title.textContent = 'Patience, les images arrivent';
                subtitle.textContent = "Nous récupérons les versions finales.";
                break;
            case 'saving':
                title.textContent = 'Sauvegarde des images';
                subtitle.textContent = "Nous stockons vos créations.";
                break;
            case 'completed':
                title.textContent = 'Images prêtes !';
                subtitle.textContent = "Cliquez pour les découvrir.";
                bar.style.width = '100%';
                text.textContent = '100%';
                break;
            case 'error':
                title.textContent = 'Une erreur est survenue';
                subtitle.textContent = "Veuillez réessayer la génération.";
                break;
            default:
                break;
        }

        if (job.stage === 'completed') {
            link.textContent = 'Voir les images';
        } else {
            link.textContent = 'Voir la génération';
        }
    }

    async function fetchJson(url, options, errorContext) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`${errorContext || 'Requête'} renvoyée avec le statut ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            error(`Erreur lors de ${errorContext || 'la requête'}`, err);
            throw err;
        }
    }

    async function checkGenerationStatus() {
        if (!job || job.stage !== 'generation') {
            return;
        }

        try {
            const response = await fetchJson(ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: new URLSearchParams({
                    action: 'check_image_status',
                    hash: job.hash
                })
            }, 'la vérification du statut');

            if (!response || !response.success) {
                warn('Réponse inattendue lors du check de statut', response);
                scheduleNextStatusCheck();
                return;
            }

            const statusData = response.data || {};
            const rawUrl = statusData.result && statusData.result.url ? statusData.result.url : null;
            let displayedUrl = rawUrl;

            if (rawUrl && rawUrl.includes('cdn.discordapp.com')) {
                displayedUrl = `${baseUrl}/wp-content/themes/customiizer/includes/proxy/proxy_discord.php?url=${encodeURIComponent(rawUrl)}`;
            }

            const progress = typeof statusData.progress === 'number' ? statusData.progress : job.progress || 0;
            updateJob({
                progress,
                lastStatus: statusData,
                displayedUrl,
                rawUrl
            }, 'job-progress', {
                statusData,
                displayedUrl,
                rawUrl
            });

            updateToast({ progress });

            if (statusData.status === 'done') {
                updateJob({
                    progress: 100,
                    stage: 'upscaling'
                }, 'job-stage', { stage: 'upscaling' });
                updateToast({ progress: 100 });
                notify('job-progress', {
                    statusData,
                    displayedUrl,
                    rawUrl
                });
                await requestUpscales();
                return;
            }
        } catch (err) {
            updateJob({ stage: 'error', status: 'error' }, 'job-error', { message: err.message });
            updateToast({ progress: job ? job.progress || 0 : 0 });
            return;
        }

        scheduleNextStatusCheck();
    }

    function scheduleNextStatusCheck() {
        if (!job || job.stage !== 'generation') {
            return;
        }
        if (pollTimeout) {
            clearTimeout(pollTimeout);
        }
        pollTimeout = setTimeout(checkGenerationStatus, DEFAULT_POLL_INTERVAL);
    }

    async function requestUpscales() {
        if (!job) {
            return;
        }

        const hashes = {};
        for (let choice = 1; choice <= 4; choice++) {
            try {
                const payload = {
                    hash: job.hash,
                    choice,
                    webhook_url: `${baseUrl}/wp-content/themes/customiizer/includes/webhook/upscale.php`,
                    webhook_type: 'result'
                };

                const response = await fetchJson('/wp-content/themes/customiizer/includes/proxy/upscale.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }, `l'envoi de l'upscale ${choice}`);

                if (response && response.status === 'success' && response.data) {
                    hashes[choice] = response.data.hash;
                }
            } catch (err) {
                warn(`Upscale ${choice} en erreur`, err);
            }
        }

        updateJob({
            stage: 'waiting-upscales',
            upscaleHashes: hashes
        }, 'job-stage', {
            stage: 'waiting-upscales',
            hashes
        });
        updateToast({ progress: job.progress || 100 });
        await waitForUpscales();
    }

    async function waitForUpscales() {
        if (!job || !job.upscaleHashes) {
            return;
        }

        let checks = 0;
        const collected = {};

        const checkOnce = async () => {
            let allAvailable = true;

            for (let choice = 1; choice <= 4; choice++) {
                const hash = job.upscaleHashes[choice];
                if (!hash) {
                    allAvailable = false;
                    continue;
                }

                try {
                    const response = await fetchJson(ajaxurl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                        },
                        body: new URLSearchParams({
                            action: 'check_image_choices',
                            hash
                        })
                    }, `la vérification de l'upscale ${choice}`);

                    if (response && response.success && response.data) {
                        const key = `image_choice_${choice}`;
                        const imageUrl = response.data[key];
                        if (imageUrl) {
                            collected[choice] = {
                                url: imageUrl,
                                hash
                            };
                        } else {
                            allAvailable = false;
                        }
                    } else {
                        allAvailable = false;
                    }
                } catch (err) {
                    allAvailable = false;
                }
            }

            if (allAvailable && Object.keys(collected).length === 4) {
                if (upscaleInterval) {
                    clearInterval(upscaleInterval);
                    upscaleInterval = null;
                }
                await saveChoices(collected);
                return;
            }

            checks += 1;
            if (checks >= UPSCALE_MAX_CHECKS) {
                if (upscaleInterval) {
                    clearInterval(upscaleInterval);
                    upscaleInterval = null;
                }
                updateJob({ stage: 'error', status: 'error' }, 'job-error', { message: 'Temps dépassé pour les upscales.' });
                updateToast({ progress: job ? job.progress || 0 : 0 });
            }
        };

        await checkOnce();
        if (!job || job.stage === 'error' || job.stage === 'completed' || job.stage === 'saving') {
            return;
        }
        upscaleInterval = setInterval(checkOnce, UPSCALE_CHECK_INTERVAL);
    }

    async function saveChoices(choices) {
        if (!job) {
            return;
        }

        updateJob({ stage: 'saving' }, 'job-stage', { stage: 'saving' });
        updateToast({ progress: 100 });

        const savedImages = [];

        for (let choice = 1; choice <= 4; choice++) {
            const data = choices[choice];
            if (!data || !data.url) {
                continue;
            }

            try {
                const savedImageUrl = `https://customiizer.blob.core.windows.net/imageclient/${job.userId}/${choice}_${job.hash}.webp`;
                await saveImageUrl(data.url, savedImageUrl, choice);
                await saveImageData(savedImageUrl, choice, data.hash);

                savedImages.push({
                    imageUrl: savedImageUrl,
                    index: choice - 1,
                    hash: data.hash
                });
            } catch (err) {
                warn(`Erreur lors de la sauvegarde de l'image ${choice}`, err);
            }
        }

        if (savedImages.length) {
            updateJob({
                images: savedImages,
                stage: 'completed',
                status: 'completed',
                completedAt: Date.now()
            }, 'job-images-saved', { images: savedImages });
            updateToast({ progress: 100 });
        } else {
            updateJob({ stage: 'error', status: 'error' }, 'job-error', { message: 'Aucune image sauvegardée.' });
            updateToast({ progress: job ? job.progress || 0 : 0 });
            return;
        }

        await cleanupTasks();
        notify('job-completed', { images: savedImages });
    }

    async function cleanupTasks() {
        if (!job) {
            return;
        }
        const hashes = [job.hash];
        if (job.upscaleHashes) {
            hashes.push(...Object.values(job.upscaleHashes));
        }

        await Promise.all(hashes.map(hash => deleteImageTask(hash)));
    }

    async function saveImageUrl(sourceUrl, savedImageUrl, imagePrefix) {
        const body = new URLSearchParams({
            url: sourceUrl,
            name: job.hash,
            prefix: imagePrefix,
            ratio: job.ratio || ''
        });

        const response = await fetch(`${baseUrl}/wp-admin/admin-ajax.php?action=save_image_from_url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`l'enregistrement distant de l'image a échoué (${response.status}) ${errorText}`);
        }

        await response.text().catch(() => '');
    }

    async function saveImageData(savedImageUrl, imagePrefix, hash) {
        const payload = new URLSearchParams({
            user_id: job.userId,
            image_url: savedImageUrl,
            source_id: job.hash,
            upscaled_id: hash,
            image_prefix: imagePrefix,
            prompt: typeof job.prompt === 'object' ? JSON.stringify(job.prompt) : (job.prompt || ''),
            format_image: job.ratio || '',
            settings: job.settings || ''
        });

        const response = await fetch(`${baseUrl}/wp-admin/admin-ajax.php?action=save_image_data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: payload
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`la sauvegarde des métadonnées de l'image a échoué (${response.status}) ${errorText}`);
        }

        await response.text().catch(() => '');

        if (Array.isArray(window.allImages)) {
            const promptValue = typeof job.prompt === 'object' ? job.prompt : (job.prompt || '');
            window.allImages.push({
                image_url: savedImageUrl,
                user_login: job.displayName || '',
                user_id: job.userId,
                upscaled_id: hash,
                format_image: job.ratio || '',
                prompt: promptValue,
                display_name: job.displayName || '',
                user_logo: job.userLogo || ''
            });
        }
    }

    async function deleteImageTask(hash) {
        if (!hash) {
            return;
        }

        try {
            await fetchJson(ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: new URLSearchParams({
                    action: 'delete_image_task',
                    hash
                })
            }, `la suppression de la tâche ${hash}`);
        } catch (err) {
            warn(`Suppression de la tâche ${hash} impossible`, err);
        }
    }

    function subscribe(listener) {
        if (typeof listener !== 'function') {
            return () => {};
        }
        listeners.add(listener);
        if (job) {
            listener({ type: 'job-restored', job: { ...job }, payload: {} });
        }
        return () => listeners.delete(listener);
    }

    function startTracking(config) {
        if (!config || !config.hash) {
            return;
        }

        const nextJob = {
            hash: config.hash,
            prompt: config.prompt || '',
            settings: config.settings || '',
            ratio: config.ratio || '',
            userId: config.userId,
            displayName: config.displayName || '',
            userLogo: config.userLogo || '',
            progress: 0,
            stage: 'generation',
            status: 'running',
            startedAt: Date.now(),
            images: []
        };

        setJob(nextJob);
        notify('job-started', {});
        updateToast({ progress: 0 });
        if (pollTimeout) {
            clearTimeout(pollTimeout);
        }
        checkGenerationStatus();
    }

    function restoreJob() {
        const stored = loadStoredJob();
        if (!stored) {
            return;
        }
        job = stored;
        notify('job-restored', {});
        updateToast({ progress: job.progress || 0 });

        if (job.stage === 'generation') {
            checkGenerationStatus();
        } else if (job.stage === 'waiting-upscales') {
            waitForUpscales();
        } else if (job.stage === 'upscaling') {
            requestUpscales();
        } else if (job.stage === 'saving') {
            if (job.images && job.images.length === 4) {
                updateJob({ stage: 'completed', status: 'completed' }, 'job-completed', { images: job.images });
                updateToast({ progress: 100 });
            } else {
                waitForUpscales();
            }
        } else if (job.stage === 'completed') {
            updateToast({ progress: 100 });
        }
    }

    window.CustomiizerBackgroundGeneration = {
        startTracking,
        subscribe,
        getJob: () => (job ? { ...job } : null),
        clear: clearJob
    };

    document.addEventListener('DOMContentLoaded', restoreJob);
})(window, document);
