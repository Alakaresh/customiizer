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
      <span class="home-hero__eyebrow">Studio de personnalisation IA</span>
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

  <!-- ======= Product Carousel Section ======= -->
  <section class="home-section home-section--products surface-card">
    <div class="home-section__header">
      <span class="home-section__eyebrow">Boutique immersive</span>
      <h2 class="title home-section__title">Explore notre collection</h2>
      <p class="text home-section__description">Découvre notre sélection de produits à personnaliser selon tes envies. Grâce à nos outils avancés, chaque objet devient une création unique.</p>
    </div>
    <div class="home-section__actions">
      <a href="<?php echo esc_url( home_url( '/boutique' ) ); ?>" class="home-button home-button--ghost">
        <i class="fas fa-magic"></i>
        <span>Personnaliser maintenant</span>
      </a>
    </div>
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
  </section>

  <!-- ======= Community Carousel Section ======= -->
  <section class="home-section home-section--community surface-card">
    <div class="home-section__header">
      <span class="home-section__eyebrow">Inspiration collective</span>
      <h2 class="title home-section__title">La Communauté Customiizer</h2>
      <p class="text home-section__description">Plonge dans l’univers créatif de notre communauté et découvre des réalisations uniques conçues par des passionnés comme toi.</p>
    </div>
    <div class="home-section__actions">
      <a href="<?php echo esc_url( home_url( '/communaute' ) ); ?>" class="home-button home-button--ghost">
        <i class="fas fa-users"></i>
        <span>Explorer la galerie</span>
      </a>
    </div>
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
  </section>

  <!-- ======= How It Works Section ======= -->
  <section class="home-section home-section--how surface-card">
    <div class="home-section__header">
      <span class="home-section__eyebrow">Expérience guidée</span>
      <h2 class="title home-section__title">Comment ça fonctionne</h2>
      <p class="text home-section__description">Suivre ces étapes suffit pour imaginer, générer et commander ta création personnalisée.</p>
    </div>
    <ol class="steps-list" aria-label="Étapes de création">
      <li class="step-card">
        <div class="step-card__header">
          <span class="step-card__number" aria-hidden="true">1</span>
          <div class="step-card__titles">
            <span class="step-card__step">Étape 1</span>
            <h3 class="step-title">Choisis ton support</h3>
          </div>
        </div>
        <p class="step-text">Rends-toi sur la page "Customiize" et sélectionne le format qui t’inspire.</p>
      </li>
      <li class="step-card">
        <div class="step-card__header">
          <span class="step-card__number" aria-hidden="true">2</span>
          <div class="step-card__titles">
            <span class="step-card__step">Étape 2</span>
            <h3 class="step-title">Génère avec l’IA</h3>
          </div>
        </div>
        <p class="step-text">Clique sur « Générer » pour obtenir une sélection d’images créatives en quelques secondes.</p>
      </li>
      <li class="step-card">
        <div class="step-card__header">
          <span class="step-card__number" aria-hidden="true">3</span>
          <div class="step-card__titles">
            <span class="step-card__step">Étape 3</span>
            <h3 class="step-title">Personnalise</h3>
          </div>
        </div>
        <p class="step-text">Affines ton design, choisis tes finitions et visualise ton produit en temps réel.</p>
      </li>
      <li class="step-card">
        <div class="step-card__header">
          <span class="step-card__number" aria-hidden="true">4</span>
          <div class="step-card__titles">
            <span class="step-card__step">Étape 4</span>
            <h3 class="step-title">Commande &amp; reçois</h3>
          </div>
        </div>
        <p class="step-text">Ajoute au panier, confirme ta commande… il ne reste plus qu’à attendre la livraison !</p>
      </li>
    </ol>
    <div class="home-section__actions">
      <a href="<?php echo esc_url( home_url( '/customiize' ) ); ?>" class="home-button home-button--primary">
        <i class="fas fa-magic"></i>
        <span>Créer maintenant</span>
      </a>
    </div>
  </section>

</main>

<?php get_footer(); ?>
