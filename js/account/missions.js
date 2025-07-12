function fetchMissions() {
    fetch(ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=customiizer_get_missions'
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                console.log('Missions récupérées:', data.data);
                renderMissions(data.data);
            } else {
                console.error('Erreur lors du chargement des missions', data);
            }
        })
        .catch(err => console.error('Erreur requête missions', err));
}

function renderMissions(list) {
    const container = document.getElementById('missions-list');
    if (!container) return;
    container.innerHTML = '';
    if (!list || list.length === 0) {
        container.textContent = 'Aucune mission en cours.';
        return;
    }

    list.forEach(m => {
        const progress = Math.min(m.progress, m.goal);
        const percent = Math.round((progress / m.goal) * 100);

        const item = document.createElement('div');
        item.className = 'mission-item';
        item.innerHTML = `
            <div class="mission-header">
                <h4>${m.title}</h4>
                <span class="points">+${m.points_reward} pts</span>
            </div>
            <p>${m.description || ''}</p>
            <div class="progress-wrapper">
                <progress max="${m.goal}" value="${progress}"></progress>
                <span class="progress-text">${percent}%</span>
            </div>
        `;
        container.appendChild(item);
    });
}

// L'appel est déclenché par sidebar.js après le chargement de la section
