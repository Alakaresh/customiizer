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
        const div = document.createElement('div');
        div.className = 'mission-item';
        const progress = Math.min(m.progress, m.goal);
        div.innerHTML = `
            <h4>${m.title}</h4>
            <p>${m.description || ''}</p>
            <progress max="${m.goal}" value="${progress}"></progress>
            <span>${progress}/${m.goal}</span>
        `;
        container.appendChild(div);
    });
}

// L'appel est déclenché par sidebar.js après le chargement de la section
