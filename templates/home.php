<?php
/*
Template Name: Home
*/
get_header();
?>
<main id="site-content" class="site-content home-page">

  <!-- ======= Hero Section ======= -->
  <section class="intro-section home-hero surface-card">
    <div class="home-hero__visual intro-image-left">
      <span class="home-hero__orb home-hero__orb--left" aria-hidden="true"></span>
      <img class="home-hero__image" src="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/hero-6.png" alt="Personnalisation produit">
    </div>
    <div class="intro-content home-hero__content">
      <span class="home-eyebrow">Studio de personnalisation IA</span>
      <h1 class="first_title home-hero__title">Donne vie à tes idées !</h1>
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
    </div>
    <div class="home-hero__visual intro-image-right">
      <span class="home-hero__orb home-hero__orb--right" aria-hidden="true"></span>
      <img class="home-hero__image" src="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/hero-4.png" alt="Création artistique">
    </div>
  </section>

  <!-- ======= Panorama Section ======= -->
  <section class="home-panorama surface-card">
    <header class="home-panorama__header">
      <span class="home-eyebrow">Expérience Customiizer</span>
      <h2 class="home-panorama__title">Tout vivre en un seul regard</h2>
      <p class="home-panorama__description">Retrouve la boutique, la communauté et le parcours de création dans un espace immersif qui valorise chaque étape de ton imagination.</p>
    </header>

    <div class="home-panorama__grid">
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
              <span class="workflow__label">Étape 1</span>
              <h4 class="workflow__title">Choisis ton produit</h4>
              <p class="workflow__description">Rends-toi dans la boutique pour sélectionner le support qui correspond à ton projet.</p>
            </div>
          </li>
          <li class="workflow__step">
            <span class="workflow__number" aria-hidden="true">2</span>
            <div class="workflow__content">
              <span class="workflow__label">Étape 2</span>
              <h4 class="workflow__title">Lance la personnalisation</h4>
              <p class="workflow__description">Commence la création : utilise des images de la communauté, importe les tiennes ou génère tes propres visuels.</p>
            </div>
          </li>
          <li class="workflow__step">
            <span class="workflow__number" aria-hidden="true">3</span>
            <div class="workflow__content">
              <span class="workflow__label">Étape 3</span>
              <h4 class="workflow__title">Positionne tes images</h4>
              <p class="workflow__description">Ajuste librement les visuels sur ton produit pour obtenir le rendu parfait.</p>
            </div>
          </li>
          <li class="workflow__step">
            <span class="workflow__number" aria-hidden="true">4</span>
            <div class="workflow__content">
              <span class="workflow__label">Étape 4</span>
              <h4 class="workflow__title">Passe commande</h4>
              <p class="workflow__description">Valide ton panier et finalise la commande : ta création est en route !</p>
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

</main>

<?php get_footer(); ?>
