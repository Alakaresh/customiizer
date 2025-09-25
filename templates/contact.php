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
