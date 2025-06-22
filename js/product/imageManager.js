window.CommunityImagesCache = {
	isLoaded: false,
	images: []
};

async function preloadCommunityImages(params = {}) {
        if (window.CommunityImagesCache.isLoaded) {
                // Notifie immédiatement les écouteurs que les images sont prêtes
                document.dispatchEvent(new CustomEvent('communityImagesLoaded', {
                        detail: { images: window.CommunityImagesCache.images }
                }));
                return;
        }


	const apiUrl = new URL("/wp-json/api/v1/images/load", window.location.origin);
	Object.keys(params).forEach(key => {
		if (params[key]) {
			apiUrl.searchParams.append(key, params[key]);
		}
	});

        try {
                const response = await fetch(apiUrl);
                const data = await response.json();

                if (data.success && Array.isArray(data.images)) {
                        window.CommunityImagesCache.images = data.images;
                        window.CommunityImagesCache.isLoaded = true;
                        // Informe les autres scripts que les images sont disponibles
                        document.dispatchEvent(new CustomEvent('communityImagesLoaded', {
                                detail: { images: data.images }
                        }));
                } else {
                        console.warn("[ImageManager] ⚠️ Pas d'images trouvées.");
                }
        } catch (error) {
                console.error("[ImageManager] ❌ Erreur API :", error);
	}
}

// Utilitaire pour accéder aux images
function getAllCommunityImages() {
	return window.CommunityImagesCache.images || [];
}
