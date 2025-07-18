function formatMissionDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString();
}

function updateMissionTotal(list) {
    const el = document.querySelector('.missions-total-points');
    if (!el || !Array.isArray(list)) return;
    const total = list.reduce((sum, m) => {
        if (m.reward_type === 'points' && m.completed_at) {
            return sum + parseInt(m.reward_amount || 0, 10);
        }
        return sum;
    }, 0);
    el.textContent = 'Total points gagnés via missions : ' + total;
}

function refreshMissionCache() {
    const container = document.getElementById('main-container');
    if (container) {
        localStorage.setItem('account-section-missions', container.innerHTML);
    }
}

async function fetchMissions(options = {}) {
    const prefetch = options.prefetch === true;
    const cacheKey = 'USER_MISSIONS';
    const versionKey = 'USER_MISSIONS_VERSION';
    const cached = sessionStorage.getItem(cacheKey);
    const cachedVersion = sessionStorage.getItem(versionKey);

    if (cached && !prefetch) {
        try {
            const list = JSON.parse(cached);
            renderMissions(list);
            updateMissionTotal(list);
            refreshMissionCache();
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
                    updateMissionTotal(list);
                    refreshMissionCache();
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


// L'appel est déclenché par sidebar.js après le chargement de la section
