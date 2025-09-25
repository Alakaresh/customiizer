<?php
/*
Template Name: Contact
*/
get_header();
?>

<main id="site-content" class="site-content">
        <section class="contact-section">
                <div class="contact-container">
                        <div class="contact-intro">
                                <h2>Une question&nbsp;?</h2>
                                <p>Notre équipe vous accompagne du lundi au vendredi pour donner vie à vos créations. Remplissez le formulaire ou contactez-nous directement via les coordonnées ci-dessous.</p>
                        </div>
                        <div class="contact-content">
                                <div class="contact-details">
                                        <div class="contact-card">
                                                <h3>Support client</h3>
                                                <p>Une demande sur une commande ou un produit&nbsp;? Nous vous répondons dans un délai de 24&nbsp;h ouvrées.</p>
                                                <a class="contact-link" href="mailto:community@customiizer.com">community@customiizer.com</a>
                                        </div>
                                        <div class="contact-card">
                                                <h3>Partenariats</h3>
                                                <p>Vous êtes une marque ou un créateur&nbsp;? Écrivons ensemble les prochaines étapes de votre projet.</p>
                                                <a class="contact-link" href="mailto:hello@customiizer.com">hello@customiizer.com</a>
                                        </div>
                                        <div class="contact-card">
                                                <h3>Horaires</h3>
                                                <p>Du lundi au vendredi<br>9&nbsp;h&nbsp;00 — 18&nbsp;h&nbsp;00 (CET)</p>
                                        </div>
                                </div>
                                <div class="contact-form">
                                        <?php echo do_shortcode('[contact-form-7 id="b4c0fb8" title="Contact form 1"]'); ?>
                                </div>
                        </div>
                </div>
        </section>
</main>

<?php
get_footer();
?>
