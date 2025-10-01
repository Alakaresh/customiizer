<div class="community-page">
        <section class="community-hero community-card" aria-labelledby="community-hero-title">
                <div class="community-hero__header">
                        <div class="community-hero__intro">
                                <span class="community-eyebrow">Inspiration collective</span>
                                <h1 class="community-hero__title" id="community-hero-title">La communauté Customiizer</h1>
                                <p class="community-hero__description">Explore les créations partagées par la communauté et trouve l'inspiration pour tes prochains projets.</p>
                        </div>
                        <div id="community-user-profile" class="community-hero__profile" style="display: none;">
                                <div id="community-user-profile-content"></div>
                        </div>
                </div>
                <div class="community-hero__toolbar" role="region" aria-label="Options de recherche et de tri">
                        <div class="search-and-sort-container">
                                <div class="sorting-container" role="group" aria-label="Trier les créations">
                                        <button id="sort-explore" type="button">Explorer</button>
                                        <button id="sort-likes" type="button">J'aime</button>
                                </div>
                                <div class="search-container">
                                        <input type="text" id="search-input" placeholder="Rechercher..." aria-label="Rechercher une création">
                                        <button id="search-button" type="button" aria-label="Lancer la recherche"><i class="fas fa-search" aria-hidden="true"></i></button>
                                </div>
                        </div>
                </div>
        </section>

        <section class="community-gallery community-card" aria-label="Galerie des créations de la communauté">
                <div class="content-container" id="image-container">
                        <div class="image-column" id="image-container1"></div>
                </div>
                <div id="scroll-message" class="community-gallery__loading">Chargement des images suivantes...</div>
                <div id="load-more-trigger" aria-hidden="true"></div>
        </section>

        <div id="imageModal" class="modal" role="dialog" aria-modal="true" aria-hidden="true">
                <img class="modal-content" id="modalImage" alt="">
                <div id="caption"></div>
        </div>
</div>
