(function(){
    if (typeof userIsLoggedIn !== 'boolean' || !userIsLoggedIn) return;

    const shownKey = 'SHOWN_MISSION_COMPLETIONS';
    let shown = [];
    try {
        shown = JSON.parse(localStorage.getItem(shownKey)) || [];
    } catch(e) {}

    function markNotified(id){
        fetch(ajaxurl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'action=customiizer_mark_mission_notified&mission_id=' + encodeURIComponent(id)
        });
    }

    function showMissionToast(mission){
        let toast = document.getElementById('mission-achievement');
        if(!toast){
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
        if(logo){
            logo.src = baseUrl + '/wp-content/themes/customiizer/assets/img/logo.png';
        }
        const titleEl = toast.querySelector('.mission-title');
        const detailsEl = toast.querySelector('.mission-details');
        if(titleEl) titleEl.textContent = 'Mission achevée';
        if(detailsEl){
            const rewards = [];
            if(mission.reward_amount > 0){
                rewards.push(`+${mission.reward_amount} ${mission.reward_type === 'credits' ? 'cr' : 'pts'}`);
            }
            detailsEl.textContent = `${rewards.join(' ')} - ${mission.title}`;
        }
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 6000);
    }

    function checkMissions(){
        fetch(ajaxurl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'action=customiizer_get_missions'
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if(!data || !data.success) return;
                const list = data.data.missions || data.data;
                const newlyCompleted = list.filter(m => m.completed_at && !m.notified_at && !shown.includes(m.mission_id));
                newlyCompleted.forEach(m => {
                    showMissionToast(m);
                    shown.push(m.mission_id);
                    markNotified(m.mission_id);
                });
                if(newlyCompleted.length){
                    localStorage.setItem(shownKey, JSON.stringify(shown));
                }
            })
            .catch(err => console.error('Mission toast fetch error', err));
    }

    window.customiizerCheckMissionToasts = checkMissions;

    window.addEventListener('load', checkMissions);
})();
