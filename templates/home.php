<?php
/*
Template Name: Home
*/
get_header();
?>
<main id="site-content" class="site-content home-page">
  <section class="home-section home-section--experience">
    <div class="home-section__inner">
      <section class="home-experience" aria-labelledby="home-experience-title">
        <div class="home-hero__content">
          <div class="home-hero__body">
            <span class="home-eyebrow">Studio de personnalisation IA</span>
            <h1 class="first_title home-hero__title" id="home-experience-title">Donne vie à tes idées !</h1>
            <p class="text home-hero__description">Libère ta créativité avec Customiizer ! Crée facilement des designs uniques grâce à notre interface intuitive. Parfait pour des projets personnels ou professionnels. Clique, imagine et personnalise en quelques instants.</p>
            <div class="home-hero__actions">
              <a href="<?php echo esc_url( home_url( '/customiize' ) ); ?>" class="home-button home-button--primary">
                <i class="fas fa-magic"></i>
                <span>Créer maintenant</span>
              </a>
              <a href="<?php echo esc_url( home_url( '/boutique' ) ); ?>" class="home-button home-button--ghost">
                <i class="fas fa-store"></i>
                <span>Explorer la boutique</span>
              </a>
            </div>
            <ul class="home-hero__highlights" aria-label="Points forts Customiizer">
              <li><i class="fas fa-star" aria-hidden="true"></i><span>Modèles exclusifs et IA générative</span></li>
              <li><i class="fas fa-bolt" aria-hidden="true"></i><span>Personnalisation en temps réel</span></li>
              <li><i class="fas fa-truck" aria-hidden="true"></i><span>Produits livrés rapidement</span></li>
            </ul>
            <div class="home-hero__metrics" aria-label="Chiffres clés Customiizer">
              <div class="home-hero__metric">
                <span class="home-hero__metric-value">+15k</span>
                <span class="home-hero__metric-label">Créations IA générées</span>
              </div>
              <div class="home-hero__metric">
                <span class="home-hero__metric-value">120</span>
                <span class="home-hero__metric-label">Supports personnalisables</span>
              </div>
              <div class="home-hero__metric">
                <span class="home-hero__metric-value">24/7</span>
                <span class="home-hero__metric-label">Assistance dédiée</span>
              </div>
            </div>
          </div>
        </div>

        <div class="home-experience__panorama">
          <header class="home-experience__header">
            <span class="home-eyebrow">Expérience Customiizer</span>
            <h2 class="home-experience__title" id="home-experience-overview">Tout vivre en un seul regard</h2>
            <p class="home-experience__description">Retrouve la boutique, la communauté et le parcours de création dans un espace immersif qui valorise chaque étape de ton imagination.</p>
          </header>

          <div class="home-experience__grid" aria-labelledby="home-experience-overview">
            <article class="home-panel home-panel--showcase">
              <div class="home-panel__intro">
                <span class="home-eyebrow">Boutique immersive</span>
                <h3 class="home-panel__title">Explore notre collection</h3>
                <p class="home-panel__text">Découvre notre sélection de supports à personnaliser et visualise-les en direct grâce à nos technologies IA. Chaque objet devient une création unique.</p>
                <div class="home-panel__actions">
                  <a href="<?php echo esc_url( home_url( '/boutique' ) ); ?>" class="home-button home-button--ghost">
                    <i class="fas fa-store"></i>
                    <span>Explorer la boutique</span>
                  </a>
                </div>
              </div>
              <div class="home-panel__media">
                <div class="carousel" id="productCarousel">
                  <button class="carousel-control-prev" role="button" aria-label="Voir les produits précédents">
                    <span class="fas fa-chevron-left" aria-hidden="true"></span>
                  </button>
                  <div class="carousel-items" aria-live="polite">
                    <!-- Les produits seront ajoutés ici par jQuery -->
                  </div>
                  <button class="carousel-control-next" role="button" aria-label="Voir les produits suivants">
                    <span class="fas fa-chevron-right" aria-hidden="true"></span>
                  </button>
                </div>
              </div>
            </article>

            <article class="home-panel home-panel--community">
              <div class="home-panel__intro">
                <span class="home-eyebrow">Inspiration collective</span>
                <h3 class="home-panel__title">La communauté Customiizer</h3>
                <p class="home-panel__text">Plonge dans l’univers créatif de nos membres et découvre des réalisations uniques conçues par des passionnés comme toi.</p>
                <div class="home-panel__actions">
                  <a href="<?php echo esc_url( home_url( '/communaute' ) ); ?>" class="home-button home-button--ghost">
                    <i class="fas fa-users"></i>
                    <span>Explorer la galerie</span>
                  </a>
                </div>
              </div>
              <div class="home-panel__media">
                <div class="carousel" id="communityCarousel">
                  <button class="carousel-control-prev" role="button" aria-label="Voir les créations précédentes">
                    <span class="fas fa-chevron-left" aria-hidden="true"></span>
                  </button>
                  <div class="carousel-images" aria-live="polite">
                    <!-- Les images seront ajoutées ici par jQuery -->
                  </div>
                  <button class="carousel-control-next" role="button" aria-label="Voir les créations suivantes">
                    <span class="fas fa-chevron-right" aria-hidden="true"></span>
                  </button>
                </div>
              </div>
            </article>

            <article class="home-panel home-panel--workflow">
              <div class="home-panel__intro">
                <span class="home-eyebrow">Expérience guidée</span>
                <h3 class="home-panel__title">Comment ça fonctionne</h3>
                <p class="home-panel__text">Suis un parcours fluide : imagine, génère, personnalise et commande ta création en quelques étapes.</p>
              </div>
              <ol class="workflow" aria-label="Étapes de création">
                <li class="workflow__step">
                  <span class="workflow__number" aria-hidden="true">1</span>
                  <div class="workflow__content">
                    <h4 class="workflow__title">Choisis ton support</h4>
                    <p class="workflow__description">Rends-toi sur la page « Customiize » et sélectionne le format qui t’inspire.</p>
                  </div>
                </li>
                <li class="workflow__step">
                  <span class="workflow__number" aria-hidden="true">2</span>
                  <div class="workflow__content">
                    <h4 class="workflow__title">Génère avec l’IA</h4>
                    <p class="workflow__description">Clique sur « Générer » pour obtenir une sélection d’images créatives en quelques secondes.</p>
                  </div>
                </li>
                <li class="workflow__step">
                  <span class="workflow__number" aria-hidden="true">3</span>
                  <div class="workflow__content">
                    <h4 class="workflow__title">Personnalise</h4>
                    <p class="workflow__description">Affine ton design, choisis tes finitions et visualise ton produit en temps réel.</p>
                  </div>
                </li>
                <li class="workflow__step">
                  <span class="workflow__number" aria-hidden="true">4</span>
                  <div class="workflow__content">
                    <h4 class="workflow__title">Commande &amp; reçois</h4>
                    <p class="workflow__description">Ajoute au panier, confirme ta commande… il ne reste plus qu’à attendre la livraison !</p>
                  </div>
                </li>
              </ol>
              <div class="home-panel__actions">
                <a href="<?php echo esc_url( home_url( '/customiize' ) ); ?>" class="home-button home-button--primary">
                  <i class="fas fa-magic"></i>
                  <span>Créer maintenant</span>
                </a>
              </div>
            </article>
          </div>
      </section>
    </div>
  </section>

  <section class="home-section home-section--spotlights">
    <div class="home-section__inner">
      <section class="home-spotlights surface-card" aria-labelledby="home-spotlights-title">
        <header class="home-spotlights__header">
          <span class="home-eyebrow">Pourquoi Customiizer ?</span>
          <h2 class="home-spotlights__title" id="home-spotlights-title">Une expérience pensée pour les créateurs exigeants</h2>
          <p class="home-spotlights__description">Combine l’intelligence artificielle, un configurateur immersif et une communauté engagée pour donner de l’écho à tes projets.</p>
        </header>
        <div class="home-spotlights__grid">
          <article class="home-spotlights__card">
            <div class="home-spotlights__icon" aria-hidden="true">
              <i class="fas fa-magic"></i>
            </div>
            <h3 class="home-spotlights__card-title">Studio IA complet</h3>
            <p class="home-spotlights__card-text">Génère des visuels haute définition, ajuste les détails et teste plusieurs styles en quelques secondes.</p>
            <ul class="home-spotlights__features">
              <li><i class="fas fa-check" aria-hidden="true"></i>Prompts assistés multilingues</li>
              <li><i class="fas fa-check" aria-hidden="true"></i>Variantes instantanées</li>
              <li><i class="fas fa-check" aria-hidden="true"></i>Export optimisé pour l’impression</li>
            </ul>
          </article>
          <article class="home-spotlights__card">
            <div class="home-spotlights__icon" aria-hidden="true">
              <i class="fas fa-layer-group"></i>
            </div>
            <h3 class="home-spotlights__card-title">Du concept à l’objet</h3>
            <p class="home-spotlights__card-text">Personnalise des supports premium et visualise le rendu final grâce à nos mockups dynamiques.</p>
            <ul class="home-spotlights__features">
              <li><i class="fas fa-check" aria-hidden="true"></i>Mockups 3D en temps réel</li>
              <li><i class="fas fa-check" aria-hidden="true"></i>Options matières et finitions</li>
              <li><i class="fas fa-check" aria-hidden="true"></i>Production et livraison suivies</li>
            </ul>
          </article>
          <article class="home-spotlights__card">
            <div class="home-spotlights__icon" aria-hidden="true">
              <i class="fas fa-users"></i>
            </div>
            <h3 class="home-spotlights__card-title">Communauté vibrante</h3>
            <p class="home-spotlights__card-text">Rejoins des designers, artistes et marques qui partagent leurs inspirations et retours d’expérience.</p>
            <ul class="home-spotlights__features">
              <li><i class="fas fa-check" aria-hidden="true"></i>Galeries thématiques</li>
              <li><i class="fas fa-check" aria-hidden="true"></i>Défis créatifs hebdomadaires</li>
              <li><i class="fas fa-check" aria-hidden="true"></i>Programme de fidélité exclusif</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  </section>

  <section class="home-section home-section--cta">
    <div class="home-section__inner">
      <section class="home-cta surface-card" aria-labelledby="home-cta-title">
        <div class="home-cta__content">
          <span class="home-eyebrow">Prêt à créer ?</span>
          <h2 class="home-cta__title" id="home-cta-title">Lance ton atelier de personnalisation dès aujourd’hui</h2>
          <p class="home-cta__description">Imagine une collection, partage-la avec ta communauté et laisse Customiizer s’occuper du reste : impression, logistique et missions fidélité.</p>
          <div class="home-cta__actions">
            <a href="<?php echo esc_url( home_url( '/customiize' ) ); ?>" class="home-button home-button--primary">
              <i class="fas fa-rocket"></i>
              <span>Démarrer un projet</span>
            </a>
            <a href="<?php echo esc_url( home_url( '/contact' ) ); ?>" class="home-button home-button--ghost">
              <i class="fas fa-comment-dots"></i>
              <span>Parler à un expert</span>
            </a>
          </div>
          <dl class="home-cta__stats">
            <div class="home-cta__stat">
              <dt>+150</dt>
              <dd>Modèles prêts à personnaliser</dd>
            </div>
            <div class="home-cta__stat">
              <dt>48h</dt>
              <dd>pour recevoir tes premiers mockups</dd>
            </div>
            <div class="home-cta__stat">
              <dt>4,9/5</dt>
              <dd>Note moyenne de la communauté</dd>
            </div>
          </dl>
        </div>
        <div class="home-cta__media" aria-hidden="true">
          <span class="home-cta__orb home-cta__orb--primary"></span>
          <span class="home-cta__orb home-cta__orb--secondary"></span>
          <div class="home-cta__mockup">
            <span class="home-cta__mockup-label">Mockup IA</span>
            <div class="home-cta__mockup-visual">
              <img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/hero-4.png" alt="">
            </div>
            <p class="home-cta__mockup-caption">Visualise instantanément tes designs sur les supports que tu préfères.</p>
          </div>
        </div>
      </section>
    </div>
  </section>
</main>

<?php get_footer(); ?>
