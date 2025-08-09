<?php get_header(); ?>
<main id="site-content" class="site-content">
  <section class="error-404" role="region" aria-labelledby="t404">
    <h1 id="t404">Page introuvable</h1>
    <p>La page que vous recherchez n'existe pas ou a été déplacée.</p>
    <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="lien">Retour à l'accueil</a>
  </section>
</main>
<?php get_footer(); ?>
