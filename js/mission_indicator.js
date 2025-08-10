(function(window, $) {
    'use strict';

    function showMissionIndicator(missions) {
        if (!missions || !missions.length) {
            return;
        }
        var mission = missions[0];
        var container = document.getElementById('mission-achievement');
        if (!container) {
            return;
        }
        var icon = container.querySelector('.mission-icon');
        if (mission.icon) {
            icon.src = mission.icon;
        }
        container.querySelector('.mission-title').textContent = mission.title || '';
        container.querySelector('.mission-details').textContent = mission.description || '';
        container.classList.add('show');
        setTimeout(function() {
            container.classList.remove('show');
        }, 6000);
    }

    function handleData(data) {
        if (data && data.missions_completed && data.missions_completed.length) {
            showMissionIndicator(data.missions_completed);
        }
    }

    if ($) {
        $(document).ajaxSuccess(function(event, xhr) {
            try {
                var data = JSON.parse(xhr.responseText);
                handleData(data);
            } catch (e) {
                // not JSON
            }
        });
    }

    var originalFetch = window.fetch;
    window.fetch = function() {
        return originalFetch.apply(this, arguments).then(function(response) {
            try {
                var clone = response.clone();
                clone.json().then(handleData).catch(function(){});
            } catch (e) {
                // ignore
            }
            return response;
        });
    };

    window.showMissionIndicator = showMissionIndicator;

})(window, window.jQuery);
