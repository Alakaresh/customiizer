<?php
get_header();
?>

<main id="site-content" class="site-content">
  <section class="error-404">
    <h1>Page introuvable</h1>
    <p>La page que vous recherchez n'existe pas ou a été déplacée.</p>
    <a href="<?php echo esc_url( home_url( '/home' ) ); ?>" class="lien">Retour à l'accueil</a>
  </section>
</main>

<?php get_footer(); ?>

