function formatMissionDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString();
}

async function fetchMissions(options = {}) {
    const prefetch = options.prefetch === true;
    const cacheKey = 'USER_MISSIONS';
    const versionKey = 'USER_MISSIONS_VERSION';
    const cached = sessionStorage.getItem(cacheKey);
    const cachedVersion = sessionStorage.getItem(versionKey);

    if (cached && !prefetch) {
        try {
            renderMissions(JSON.parse(cached));
        } catch (e) {
            console.warn('Cache parse error for missions', e);
        }
    }

    const serverVersion = await getMissionsVersion();

    if (cached && cachedVersion && serverVersion && cachedVersion === serverVersion) {
        return;
    }

    fetch(ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=customiizer_get_missions'
    })
        .then(res => {
            // WordPress can return an HTML error page (e.g. 500/504)
            // so parse JSON only when the request was successful
            if (!res.ok) {
                console.error('Erreur HTTP lors du chargement des missions', res.status);
                return null;
            }
            return res.json();
        })
        .then(data => {
            if (!data) return;
            if (data.success) {
                const list = data.data.missions || data.data;
                const version = data.data.version;

                sessionStorage.setItem(cacheKey, JSON.stringify(list));
                if (version) {
                    sessionStorage.setItem(versionKey, version);
                }
                if (!prefetch) {
                    console.log('Missions récupérées:', list);
                    renderMissions(list);
                    checkMissionNotifications();
                }
            } else {
                console.error('Erreur lors du chargement des missions', data);
            }
        })
        .catch(err => console.error('Erreur requête missions', err));
}

async function getMissionsVersion() {
    try {
        const res = await fetch(ajaxurl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'action=customiizer_get_missions_version'
        });
        // WordPress may respond with an HTML error page; only parse JSON
        // if the HTTP status indicates success
        if (!res.ok) {
            console.error('Erreur HTTP lors de la vérification de version des missions', res.status);
            return null;
        }
        const data = await res.json();
        if (data.success) {
            return data.data.version;
        }
    } catch (e) {
        console.error('Erreur lors de la vérification de version des missions', e);
    }
    return null;
}

function renderMissions(list) {
    const listContainer = document.getElementById('missions-list');
    const catContainer = document.getElementById('mission-categories');
    if (!listContainer || !catContainer) return;
    catContainer.innerHTML = '';
    listContainer.innerHTML = '';
    if (!list || list.length === 0) {
        listContainer.textContent = 'Aucune mission en cours.';
        return;
    }

    const groups = {};
    list.forEach(mission => {
        const cat = mission.category || 'Autres';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(mission);
    });

    const categories = Object.keys(groups);
    if (categories.length === 0) {
        listContainer.textContent = 'Aucune mission en cours.';
        return;
    }

    let currentCategory = categories[0];

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'mission-category-item';
        btn.textContent = cat;
        if (cat === currentCategory) btn.classList.add('active');
        btn.addEventListener('click', () => {
            currentCategory = cat;
            Array.from(catContainer.children).forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            renderCategory(cat);
        });
        catContainer.appendChild(btn);
    });

    function renderCategory(cat) {
        listContainer.innerHTML = '';
        (groups[cat] || []).forEach(m => {
            const progress = Math.min(m.progress, m.goal);
            const percent = Math.round((progress / m.goal) * 100);
            const completed = m.completed_at && progress >= m.goal;
            const completedText = completed
                ? `<div class="mission-completed">Terminée le ${formatMissionDate(m.completed_at)}</div>`
                : '';

            const item = document.createElement('div');
            item.className = 'mission-item' + (completed ? ' completed' : '');
            const rewards = [];
            if (m.reward_amount > 0) {
                rewards.push(`+${m.reward_amount} ${m.reward_type === 'credits' ? 'cr' : 'pts'}`);
            }
            item.innerHTML = `
                <div class="mission-header">
                    <h4>${m.title}</h4>
                    <span class="points">${rewards.join(' ')}</span>
                </div>
                <p>${m.description || ''}</p>
                <div class="progress-wrapper">
                    <progress max="${m.goal}" value="${progress}"></progress>
                    <span class="progress-text">${percent}% (<span class="progress-counter">${progress}/${m.goal}</span>)</span>
                </div>
                ${completedText}
            `;
            listContainer.appendChild(item);
        });
    }

    renderCategory(currentCategory);
}

function showMissionToast(mission) {
    let toast = document.getElementById('mission-achievement');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'mission-achievement';
        toast.innerHTML = `
            <img class="mission-icon" alt="Logo">
            <div class="mission-info">
                <div class="mission-title"></div>
                <div class="mission-details"></div>
            </div>`;
        document.body.appendChild(toast);
    }

    const logo = toast.querySelector('.mission-icon');
    if (logo) {
        logo.src = baseUrl + '/wp-content/themes/customiizer/assets/img/logo.png';
    }
    const titleEl = toast.querySelector('.mission-title');
    const detailsEl = toast.querySelector('.mission-details');
    if (titleEl) titleEl.textContent = 'Mission achevée';
    if (detailsEl) {
        const rewards = [];
        if (mission.reward_amount > 0) {
            rewards.push(`+${mission.reward_amount} ${mission.reward_type === 'credits' ? 'cr' : 'pts'}`);
        }
        detailsEl.textContent = `${rewards.join(' ')} - ${mission.title}`;
    }

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 6000);
}

function checkMissionNotifications() {
    fetch(ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=customiizer_get_mission_notifications'
    })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
            if (!data || !data.success) return;
            (data.data.missions || data.data).forEach(m => showMissionToast(m));
        })
        .catch(err => console.error('Erreur notification missions', err));
}

// L'appel est déclenché par sidebar.js après le chargement de la section
