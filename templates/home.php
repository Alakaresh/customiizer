<?php
/*
Template Name: Home
*/
get_header();
?>
<main id="site-content" class="site-content home-landing">

  <!-- ======= Hero Section ======= -->
  <section class="home-section home-hero">
    <div class="home-frame home-frame--hero">
      <div class="home-frame__band home-frame__band--left" aria-hidden="true"></div>
      <div class="home-frame__background">
        <img class="home-frame__background-image" src="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/fond_shop.png" alt="" aria-hidden="true" loading="lazy">
        <div class="home-section__content">
          <div class="home-hero__layout">
            <div class="home-hero__media home-hero__media--left">
              <img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/hero-6.png" alt="Créations personnalisées" loading="lazy">
            </div>
            <div class="product-details__card home-hero__card">
              <h1 class="home-section__title">Donne vie à tes idées !</h1>
              <p class="home-section__text">Libère ta créativité avec Customiizer. Crée facilement des designs uniques grâce à notre interface intuitive. Parfait pour des projets personnels ou professionnels.</p>
              <div class="home-section__actions">
                <a href="<?php echo esc_url( home_url( '/customiize' ) ); ?>" class="design-button">
                  <span class="fas fa-magic" aria-hidden="true"></span>
                  <span class="design-button__label">Créer maintenant</span>
                </a>
              </div>
            </div>
            <div class="home-hero__media home-hero__media--right">
              <img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/hero-4.png" alt="Inspiration créative" loading="lazy">
            </div>
          </div>
        </div>
      </div>
      <div class="home-frame__band home-frame__band--right" aria-hidden="true"></div>
    </div>
  </section>

  <!-- ======= Product Carousel Section ======= -->
  <section class="home-section home-products">
    <div class="home-frame">
      <div class="home-frame__band home-frame__band--left" aria-hidden="true"></div>
      <div class="home-frame__background">
        <div class="home-section__content">
          <div class="product-details__card home-section__card">
            <header class="home-section__header">
              <h2 class="home-section__title">Explore notre collection</h2>
              <p class="home-section__text">Découvre notre sélection de produits à personnaliser selon tes envies. Grâce à nos outils avancés, chaque objet devient une création unique.</p>
            </header>
            <div class="home-section__actions">
              <a href="<?php echo esc_url( home_url( '/boutique' ) ); ?>" class="design-button">
                <span class="fas fa-store" aria-hidden="true"></span>
                <span class="design-button__label">Personnaliser maintenant</span>
              </a>
            </div>
            <div class="home-carousel">
              <div class="carousel" id="productCarousel">
                <button class="carousel-control-prev" type="button" aria-label="Voir les produits précédents">
                  <span class="fas fa-chevron-left" aria-hidden="true"></span>
                </button>
                <div class="carousel-items">
                  <!-- Les produits seront ajoutés ici par jQuery -->
                </div>
                <button class="carousel-control-next" type="button" aria-label="Voir les produits suivants">
                  <span class="fas fa-chevron-right" aria-hidden="true"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="home-frame__band home-frame__band--right" aria-hidden="true"></div>
    </div>
  </section>

  <!-- ======= Community Carousel Section ======= -->
  <section class="home-section home-community">
    <div class="home-frame">
      <div class="home-frame__band home-frame__band--left" aria-hidden="true"></div>
      <div class="home-frame__background">
        <div class="home-section__content">
          <div class="product-details__card home-section__card">
            <header class="home-section__header">
              <h2 class="home-section__title">La communauté Customiizer</h2>
              <p class="home-section__text">Plonge dans l’univers créatif de notre communauté et découvre des œuvres inspirantes générées par nos utilisateurs.</p>
            </header>
            <div class="home-section__actions">
              <a href="<?php echo esc_url( home_url( '/communaute' ) ); ?>" class="design-button">
                <span class="fas fa-users" aria-hidden="true"></span>
                <span class="design-button__label">Explorer la galerie</span>
              </a>
            </div>
            <div class="home-carousel">
              <div class="carousel" id="communityCarousel">
                <button class="carousel-control-prev" type="button" aria-label="Voir les créations précédentes">
                  <span class="fas fa-chevron-left" aria-hidden="true"></span>
                </button>
                <div class="carousel-images">
                  <!-- Les images seront ajoutées ici par jQuery -->
                </div>
                <button class="carousel-control-next" type="button" aria-label="Voir les créations suivantes">
                  <span class="fas fa-chevron-right" aria-hidden="true"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="home-frame__band home-frame__band--right" aria-hidden="true"></div>
    </div>
  </section>

  <!-- ======= How It Works Section ======= -->
  <section class="home-section home-steps">
    <div class="home-frame home-frame--compact">
      <div class="home-frame__band home-frame__band--left" aria-hidden="true"></div>
      <div class="home-frame__background">
        <div class="home-section__content">
          <div class="product-details__card home-section__card">
            <header class="home-section__header">
              <h2 class="home-section__title">Comment ça fonctionne</h2>
              <p class="home-section__text">Quelques étapes suffisent pour transformer ton idée en création prête à être imprimée.</p>
            </header>
            <ol class="home-steps__list">
              <li class="home-steps__item">Rends-toi sur la page «&nbsp;Customiize&nbsp;» et choisis ton format.</li>
              <li class="home-steps__item">Clique sur «&nbsp;Générer&nbsp;» et explore les images proposées.</li>
              <li class="home-steps__item">Sélectionne le visuel parfait pour ton produit.</li>
              <li class="home-steps__item">Ajuste, ajoute au panier… et profite&nbsp;!</li>
            </ol>
            <div class="home-section__actions">
              <a href="<?php echo esc_url( home_url( '/customiize' ) ); ?>" class="design-button">
                <span class="fas fa-magic" aria-hidden="true"></span>
                <span class="design-button__label">Lancer ma création</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div class="home-frame__band home-frame__band--right" aria-hidden="true"></div>
    </div>
  </section>

</main>

<?php get_footer(); ?>
