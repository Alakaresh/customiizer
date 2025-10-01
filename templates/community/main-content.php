<div class="community-page">
        <section class="community-hero">
                <div class="community-hero__card">
                        <div class="community-hero__intro">
                                <span class="community-eyebrow">Communauté</span>
                                <h1 class="community-hero__title">Explore la créativité collective</h1>
                                <p class="community-hero__subtitle">
                                        Plonge dans les dernières créations partagées par la communauté Customiizer, inspire-toi et trouve la prochaine idée qui fera vibrer ta marque.
                                </p>
                                <div class="community-hero__actions">
                                        <a class="community-button community-button--primary" href="/customiize">
                                                <i class="fas fa-plus" aria-hidden="true"></i>
                                                Lancer une création
                                        </a>
                                        <a class="community-button community-button--ghost" href="#image-container">
                                                <i class="fas fa-compass" aria-hidden="true"></i>
                                                Explorer la galerie
                                        </a>
                                </div>
                        </div>

                        <div id="community-user-profile" class="community-user-profile">
                                <div id="community-user-profile-content"></div>
                        </div>
                </div>
        </section>

        <section class="community-feed">
                <div class="community-feed__card">
                        <div class="community-feed__header">
                                <div class="community-tabs" role="tablist" aria-label="Modes d'exploration de la communauté">
                                        <button id="sort-explore" class="community-tabs__button active" type="button">Explorer</button>
                                        <button id="sort-likes" class="community-tabs__button" type="button">J'aime</button>
                                </div>

                                <div class="community-search" role="search">
                                        <label class="community-search__label" for="search-input">Rechercher une création</label>
                                        <div class="community-search__field">
                                                <i class="fas fa-search" aria-hidden="true"></i>
                                                <input type="text" id="search-input" placeholder="Rechercher une création, un style, un membre…">
                                                <button id="search-button" type="button" aria-label="Lancer la recherche">
                                                        <span class="sr-only">Rechercher</span>
                                                        <i class="fas fa-arrow-right" aria-hidden="true"></i>
                                                </button>
                                        </div>
                                </div>
                        </div>

                        <div class="community-feed__grid" id="image-container">
                                <div class="image-column" id="image-container1"></div>
                        </div>
                </div>
        </section>

        <div id="scroll-message" class="community-scroll-message">Chargement des images suivantes...</div>
        <div id="load-more-trigger"></div>
</div>

<div id="imageModal" class="modal">
        <img class="modal-content" id="modalImage">
        <div id="caption"></div>
</div>
