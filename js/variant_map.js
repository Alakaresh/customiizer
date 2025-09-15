(function () {
    async function loadMap(force) {
        try {
            if (!force) {
                const cached = sessionStorage.getItem('variantProductMap');
                if (cached) {
                    const data = JSON.parse(cached);
                    window.customizerVariantMap = data.map || {};
                    return;
                }
            }
            const res = await fetch('/wp-json/api/v1/products/variant-map');
            if (res.ok) {
                const data = await res.json();
                window.customizerVariantMap = data.map || {};
                try {
                    sessionStorage.setItem('variantProductMap', JSON.stringify(data));
                } catch (e) {}
            } else {
                window.customizerVariantMap = window.customizerVariantMap || {};
            }
        } catch (err) {
            console.error('Failed to load variant map', err);
            window.customizerVariantMap = window.customizerVariantMap || {};
        }
    }

    window.getProductByVariant = function (variantId) {
        return (window.customizerVariantMap || {})[variantId] || null;
    };

    window.refreshVariantMap = async function () {
        sessionStorage.removeItem('variantProductMap');
        await loadMap(true);
    };

    document.addEventListener('DOMContentLoaded', function () {
        loadMap(false);
    });
})();
