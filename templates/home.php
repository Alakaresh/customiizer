<?php
/*
Template Name: Home
*/
get_header();
?>
<main id="site-content" class="site-content home-page">

  <section class="home-hero" aria-labelledby="home-hero-title">
    <div class="home-hero__band" aria-hidden="true"></div>
    <div class="home-hero__inner">
      <img src="<?php echo esc_url( get_stylesheet_directory_uri() . '/assets/img/fond_shop.png' ); ?>" alt="" class="home-hero__background" aria-hidden="true">
      <div class="home-hero__grid">
        <div class="home-hero__copy home-card">
          <span class="home-hero__eyebrow"><?php esc_html_e( 'Crée sans limites', 'customiizer' ); ?></span>
          <h1 id="home-hero-title" class="home-hero__title">Donne vie à tes idées !</h1>
          <p class="home-hero__text"><?php esc_html_e( 'Libère ta créativité avec Customiizer ! Crée facilement des designs uniques grâce à notre interface intuitive. Parfait pour des projets personnels ou professionnels. Clique, imagine et personnalise en quelques instants.', 'customiizer' ); ?></p>
          <div class="home-hero__actions">
            <a href="<?php echo esc_url( home_url( '/customiize' ) ); ?>" class="home-button home-button--primary">
              <i class="fas fa-magic" aria-hidden="true"></i>
              <span><?php esc_html_e( 'Créer maintenant', 'customiizer' ); ?></span>
            </a>
            <a href="<?php echo esc_url( home_url( '/boutique' ) ); ?>" class="home-button home-button--ghost">
              <i class="fas fa-store" aria-hidden="true"></i>
              <span><?php esc_html_e( 'Explorer la boutique', 'customiizer' ); ?></span>
            </a>
          </div>
          <div class="home-hero__avatars">
            <div class="home-hero__avatars-images" aria-hidden="true">
              <img src="<?php echo esc_url( get_stylesheet_directory_uri() . '/assets/img/hero-6.png' ); ?>" alt="">
              <img src="<?php echo esc_url( get_stylesheet_directory_uri() . '/assets/img/hero-4.png' ); ?>" alt="">
            </div>
            <p class="home-hero__avatars-text"><?php esc_html_e( 'Une communauté de créateurs passionnés partage déjà ses meilleures idées.', 'customiizer' ); ?></p>
          </div>
        </div>
        <div class="home-hero__preview home-card">
          <div class="home-hero__preview-media">
            <img src="<?php echo esc_url( get_stylesheet_directory_uri() . '/images/default-image.png' ); ?>" alt="<?php esc_attr_e( 'Aperçu de produit personnalisé', 'customiizer' ); ?>">
          </div>
          <ul class="home-hero__list">
            <li>
              <span class="home-hero__list-icon" aria-hidden="true"></span>
              <span><?php esc_html_e( 'Interface intuitive et rapide à prendre en main', 'customiizer' ); ?></span>
            </li>
            <li>
              <span class="home-hero__list-icon" aria-hidden="true"></span>
              <span><?php esc_html_e( 'Bibliothèque d’images générées par l’IA prêtes à l’emploi', 'customiizer' ); ?></span>
            </li>
            <li>
              <span class="home-hero__list-icon" aria-hidden="true"></span>
              <span><?php esc_html_e( 'Aperçu fidèle du rendu final de ton produit', 'customiizer' ); ?></span>
            </li>
          </ul>
          <div class="home-hero__stat">
            <strong>+3K</strong>
            <span><?php esc_html_e( 'créations partagées cette année', 'customiizer' ); ?></span>
          </div>
        </div>
      </div>
    </div>
    <div class="home-hero__band" aria-hidden="true"></div>
  </section>

  <section class="home-section home-section--carousel">
    <div class="home-section__inner home-card">
      <div class="home-section__header">
        <h2 class="home-section__title"><?php esc_html_e( 'Explore notre collection', 'customiizer' ); ?></h2>
        <p class="home-section__description"><?php esc_html_e( 'Découvre notre sélection de produits à personnaliser selon tes envies. Grâce à nos outils avancés, chaque objet devient une création unique.', 'customiizer' ); ?></p>
        <div class="home-section__actions">
          <a href="<?php echo esc_url( home_url( '/boutique' ) ); ?>" class="home-button home-button--ghost">
            <i class="fas fa-shopping-bag" aria-hidden="true"></i>
            <span><?php esc_html_e( 'Voir la boutique', 'customiizer' ); ?></span>
          </a>
        </div>
      </div>
      <div class="home-section__body">
        <div class="carousel" id="productCarousel">
          <button class="carousel-control-prev" type="button" aria-label="<?php esc_attr_e( 'Voir les produits précédents', 'customiizer' ); ?>">
            <span class="fas fa-chevron-left" aria-hidden="true"></span>
          </button>
          <div class="carousel-items">
            <!-- Les produits seront ajoutés ici par jQuery -->
          </div>
          <button class="carousel-control-next" type="button" aria-label="<?php esc_attr_e( 'Voir les produits suivants', 'customiizer' ); ?>">
            <span class="fas fa-chevron-right" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </div>
  </section>

  <section class="home-section home-section--community">
    <div class="home-section__inner home-card">
      <div class="home-section__header">
        <h2 class="home-section__title"><?php esc_html_e( 'La Communauté Customiizer', 'customiizer' ); ?></h2>
        <p class="home-section__description"><?php esc_html_e( 'Plonge dans l’univers créatif de notre communauté et découvre des créations inspirantes à personnaliser à ton tour.', 'customiizer' ); ?></p>
        <div class="home-section__actions">
          <a href="<?php echo esc_url( home_url( '/communaute' ) ); ?>" class="home-button home-button--primary">
            <i class="fas fa-users" aria-hidden="true"></i>
            <span><?php esc_html_e( 'Explorer la galerie', 'customiizer' ); ?></span>
          </a>
        </div>
      </div>
      <div class="home-section__body">
        <div class="carousel" id="communityCarousel">
          <button class="carousel-control-prev" type="button" aria-label="<?php esc_attr_e( 'Voir les créations précédentes', 'customiizer' ); ?>">
            <span class="fas fa-chevron-left" aria-hidden="true"></span>
          </button>
          <div class="carousel-images">
            <!-- Les images seront ajoutées ici par jQuery -->
          </div>
          <button class="carousel-control-next" type="button" aria-label="<?php esc_attr_e( 'Voir les créations suivantes', 'customiizer' ); ?>">
            <span class="fas fa-chevron-right" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </div>
  </section>

  <section class="home-section home-section--steps">
    <div class="home-section__inner home-card">
      <div class="home-section__header">
        <h2 class="home-section__title"><?php esc_html_e( 'Comment ça fonctionne', 'customiizer' ); ?></h2>
        <p class="home-section__description"><?php esc_html_e( 'Un parcours simple pour transformer ton idée en produit unique.', 'customiizer' ); ?></p>
      </div>
      <ol class="steps-list">
        <li class="step-card">
          <span class="step-card__number">01</span>
          <p class="step-card__text"><?php esc_html_e( 'Rends-toi sur la page « Customiize » et choisis ton format.', 'customiizer' ); ?></p>
        </li>
        <li class="step-card">
          <span class="step-card__number">02</span>
          <p class="step-card__text"><?php esc_html_e( 'Génère des visuels en quelques secondes et sélectionne ton préféré.', 'customiizer' ); ?></p>
        </li>
        <li class="step-card">
          <span class="step-card__number">03</span>
          <p class="step-card__text"><?php esc_html_e( 'Ajuste le design, ajoute-le à ton panier et valide ta commande.', 'customiizer' ); ?></p>
        </li>
        <li class="step-card">
          <span class="step-card__number">04</span>
          <p class="step-card__text"><?php esc_html_e( 'Reçois ton produit personnalisé chez toi et profite-en !', 'customiizer' ); ?></p>
        </li>
      </ol>
      <div class="home-section__actions">
        <a href="<?php echo esc_url( home_url( '/customiize' ) ); ?>" class="home-button home-button--primary">
          <i class="fas fa-magic" aria-hidden="true"></i>
          <span><?php esc_html_e( 'Je me lance', 'customiizer' ); ?></span>
        </a>
      </div>
    </div>
  </section>

</main>

<?php get_footer(); ?>
