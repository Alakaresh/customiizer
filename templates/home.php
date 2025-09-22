<?php
/*
Template Name: Home
*/
get_header();
?>
<main id="site-content" class="site-content home-page">
  <section class="home-panel home-panel--hero" aria-labelledby="home-hero-title">
    <div class="home-panel__intro">
      <span class="home-eyebrow">Studio de personnalisation IA</span>
      <h1 class="first_title home-panel__headline" id="home-hero-title">Donne vie à tes idées !</h1>
      <p class="text home-panel__description">Libère ta créativité avec Customiizer ! Crée facilement des designs uniques grâce à notre interface intuitive. Parfait pour des projets personnels ou professionnels. Clique, imagine et personnalise en quelques instants.</p>
      <div class="home-panel__actions">
        <a href="<?php echo esc_url( home_url( '/customiize' ) ); ?>" class="home-button home-button--primary">
          <i class="fas fa-magic"></i>
          <span>Créer maintenant</span>
        </a>
        <a href="<?php echo esc_url( home_url( '/boutique' ) ); ?>" class="home-button home-button--ghost">
          <i class="fas fa-store"></i>
          <span>Explorer la boutique</span>
        </a>
      </div>
    </div>
    <div class="home-panel__media">
      <ul class="home-panel__highlights" aria-label="Points forts Customiizer">
        <li><i class="fas fa-star" aria-hidden="true"></i><span>Modèles exclusifs et IA générative</span></li>
        <li><i class="fas fa-bolt" aria-hidden="true"></i><span>Personnalisation en temps réel</span></li>
        <li><i class="fas fa-truck" aria-hidden="true"></i><span>Produits livrés rapidement</span></li>
      </ul>
      <div class="home-panel__metrics" aria-label="Chiffres clés Customiizer">
        <div class="home-panel__metric">
          <span class="home-panel__metric-value">+15k</span>
          <span class="home-panel__metric-label">Créations IA générées</span>
        </div>
        <div class="home-panel__metric">
          <span class="home-panel__metric-value">120</span>
          <span class="home-panel__metric-label">Supports personnalisables</span>
        </div>
        <div class="home-panel__metric">
          <span class="home-panel__metric-value">24/7</span>
          <span class="home-panel__metric-label">Assistance dédiée</span>
        </div>
      </div>
    </div>
  </section>

  <section class="home-panel home-panel--showcase" aria-labelledby="home-showcase-title">
    <div class="home-panel__intro">
      <span class="home-eyebrow">Boutique immersive</span>
      <h2 class="home-panel__title" id="home-showcase-title">Explore notre collection</h2>
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
  </section>

  <section class="home-panel home-panel--community" aria-labelledby="home-community-title">
    <div class="home-panel__intro">
      <span class="home-eyebrow">Inspiration collective</span>
      <h2 class="home-panel__title" id="home-community-title">La communauté Customiizer</h2>
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
  </section>

  <section class="home-panel home-panel--workflow" aria-labelledby="home-workflow-title">
    <div class="home-panel__intro">
      <span class="home-eyebrow">Expérience guidée</span>
      <h2 class="home-panel__title" id="home-workflow-title">Comment ça fonctionne</h2>
      <p class="home-panel__text">Suis un parcours fluide : imagine, génère, personnalise et commande ta création en quelques étapes.</p>
    </div>
    <div class="home-panel__media">
      <ol class="workflow" aria-label="Étapes de création">
        <li class="workflow__step">
          <span class="workflow__number" aria-hidden="true">1</span>
          <div class="workflow__content">
            <h3 class="workflow__title">Choisis ton support</h3>
            <p class="workflow__description">Rends-toi sur la page « Customiize » et sélectionne le format qui t’inspire.</p>
          </div>
        </li>
        <li class="workflow__step">
          <span class="workflow__number" aria-hidden="true">2</span>
          <div class="workflow__content">
            <h3 class="workflow__title">Génère avec l’IA</h3>
            <p class="workflow__description">Clique sur « Générer » pour obtenir une sélection d’images créatives en quelques secondes.</p>
          </div>
        </li>
        <li class="workflow__step">
          <span class="workflow__number" aria-hidden="true">3</span>
          <div class="workflow__content">
            <h3 class="workflow__title">Personnalise</h3>
            <p class="workflow__description">Affine ton design, choisis tes finitions et visualise ton produit en temps réel.</p>
          </div>
        </li>
        <li class="workflow__step">
          <span class="workflow__number" aria-hidden="true">4</span>
          <div class="workflow__content">
            <h3 class="workflow__title">Commande &amp; reçois</h3>
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
    </div>
  </section>

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
    </div>
  </section>
  <button class="scroll-to-top" type="button" aria-label="Revenir en haut">
    <i class="fas fa-arrow-up" aria-hidden="true"></i>
  </button>
</main>

<?php get_footer(); ?>
