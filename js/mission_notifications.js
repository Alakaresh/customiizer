(function(){
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
        if (logo && window.baseUrl) {
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

    window.showMissionToast = showMissionToast;
})();
