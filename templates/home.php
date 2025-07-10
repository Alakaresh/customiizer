<?php
/*
Template Name: Home
*/
get_header();
?>
<main id="site-content" class="site-content">

  <!-- ======= About Us Section ======= -->
  <div class="intro-section">
    <div class="intro-image-left">
        <img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/hero-6.png" alt="...">
    </div>
    <div class="intro-content">
        <h1 class="first_title">Donne vie à tes idées !</h1>
        <p class="text">Libère ta créativité avec Customiizer ! Crée facilement des designs uniques grâce à notre interface intuitive. Parfait pour des projets personnels ou professionnels. Clique, imagine et personnalise en quelques instants.</p>
        <a href="<?php echo esc_url( home_url( '/customiize' ) ); ?>" class="lien">
            <i class="fas fa-magic"></i> Créer maintenant
        </a>
    </div>
    <div class="intro-image-right">
        <img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/img/hero-4.png" alt="Right Image">
    </div>
  </div>

  <!-- ======= Product Carousel Section ======= -->
  <div class="product-carousel-section" style="text-align: center; margin-top: 40px;">
    <h2 class="title">Explore notre collection</h2>
    <p class="text">
      Découvre notre sélection de produits à personnaliser selon tes envies. Grâce à nos outils avancés, chaque objet devient une création unique.
    </p>
    <a href="<?php echo esc_url( home_url( '/boutique' ) ); ?>" class="lien">
      <i class="fas fa-magic"></i> Personnaliser maintenant
    </a>
    <div class="carousel" id="productCarousel">
      <button class="carousel-control-prev" role="button">
        <span class="fas fa-chevron-left"></span>
      </button>
      <div class="carousel-items">
        <!-- Les produits seront ajoutés ici par jQuery -->
      </div>
      <button class="carousel-control-next" role="button">
        <span class="fas fa-chevron-right"></span>
      </button>
    </div>
  </div>

  <!-- ======= Community Carousel Section ======= -->
  <div class="content-header" style="text-align: center; margin-top: 40px;">
    <h2 class="title">La Communauté Customiizer</h2>
    <p class="text">
      Plonge dans l’univers créatif de notre communauté !
    </p>
    <a href="<?php echo esc_url( home_url( '/communaute' ) ); ?>" class="lien">
      <i class="fas fa-users"></i> Explorer la galerie
    </a>
  </div>

  <div class="carousel" id="communityCarousel">
    <button class="carousel-control-prev" role="button">
        <span class="fas fa-chevron-left"></span>
    </button>
    <div class="carousel-images">
        <!-- Les images seront ajoutées ici par jQuery -->
    </div>
    <button class="carousel-control-next" role="button">
        <span class="fas fa-chevron-right"></span>
    </button>
  </div>

  <!-- ======= How It Works Section ======= -->
  <div class="how-it-works-section">
      <h2 class="title">Comment ça fonctionne</h2>
      <ol class="steps-list" style="margin:0; padding: 0; list-style-position: inside;">
          <li><p class="step-text">Rends-toi sur la page "Customiize" et choisis ton format.</p></li>
          <li><p class="step-text">Clique sur "Générer" et attends les images proposées.</p></li>
          <li><p class="step-text">Sélectionne une image pour ton produit.</p></li>
          <li><p class="step-text">Ajuste, ajoute au panier... et profite !</p></li>
      </ol>
      <a href="<?php echo esc_url( home_url( '/customiize' ) ); ?>" class="lien">
          <i class="fas fa-magic"></i> Créer maintenant
      </a>
  </div>

</main>

<?php get_footer(); ?>
