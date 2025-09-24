<?php
/*
Template Name: Contact
*/
get_header();
?>

<main id="site-content" class="site-content contact-page">
        <section class="contact-hero" aria-labelledby="contact-hero-title">
                <div class="contact-hero__intro">
                        <span class="contact-eyebrow">Support Customiizer</span>
                        <h1 class="contact-hero__title" id="contact-hero-title">Restons en contact</h1>
                        <p class="contact-hero__description">Que ce soit pour une question technique, une demande de partenariat ou un accompagnement créatif, notre équipe te répond rapidement et avec soin.</p>
                        <div class="contact-hero__actions">
                                <a class="contact-button contact-button--primary" href="#contact-form">
                                        <i class="fas fa-paper-plane" aria-hidden="true"></i>
                                        <span>Envoyer un message</span>
                                </a>
                                <a class="contact-button contact-button--ghost" href="mailto:support@customiizer.com">
                                        <i class="fas fa-envelope-open" aria-hidden="true"></i>
                                        <span>Nous écrire directement</span>
                                </a>
                        </div>
                </div>
                <ul class="contact-hero__highlights" aria-label="Nos engagements support">
                        <li>
                                <i class="fas fa-clock" aria-hidden="true"></i>
                                <span>Réponse sous 24h ouvrées</span>
                        </li>
                        <li>
                                <i class="fas fa-headset" aria-hidden="true"></i>
                                <span>Accompagnement personnalisé</span>
                        </li>
                        <li>
                                <i class="fas fa-shield-alt" aria-hidden="true"></i>
                                <span>Données protégées et sécurisées</span>
                        </li>
                </ul>
        </section>

        <section class="contact-section contact-methods" aria-labelledby="contact-methods-title">
                <div class="contact-section__header">
                        <span class="contact-eyebrow">Nous joindre</span>
                        <h2 class="contact-section__title" id="contact-methods-title">Choisis le canal idéal</h2>
                        <p class="contact-section__description">Explique-nous ton besoin : nous orienterons ta demande vers la bonne équipe pour te répondre le plus efficacement possible.</p>
                </div>
                <div class="contact-methods__grid">
                        <article class="contact-card">
                                <div class="contact-card__icon" aria-hidden="true">
                                        <i class="fas fa-life-ring"></i>
                                </div>
                                <h3 class="contact-card__title">Support client</h3>
                                <p class="contact-card__text">Questions techniques, suivi de commande, accès à ton compte… notre équipe est là pour t'aider au quotidien.</p>
                                <a class="contact-card__link" href="mailto:support@customiizer.com">support@customiizer.com</a>
                        </article>
                        <article class="contact-card">
                                <div class="contact-card__icon" aria-hidden="true">
                                        <i class="fas fa-magic"></i>
                                </div>
                                <h3 class="contact-card__title">Accompagnement créatif</h3>
                                <p class="contact-card__text">Besoin d'une recommandation sur un design ou d'un avis pour ton projet ? Partage-nous ton brief et nous te guiderons.</p>
                                <a class="contact-card__link" href="#contact-form">Décrire mon projet</a>
                        </article>
                        <article class="contact-card">
                                <div class="contact-card__icon" aria-hidden="true">
                                        <i class="fas fa-handshake"></i>
                                </div>
                                <h3 class="contact-card__title">Partenariats &amp; presse</h3>
                                <p class="contact-card__text">Tu représentes une marque, une école ou un média ? Écrivons ensemble la prochaine collaboration Customiizer.</p>
                                <a class="contact-card__link" href="mailto:hello@customiizer.com">hello@customiizer.com</a>
                        </article>
                </div>
        </section>

        <section class="contact-section contact-details" aria-labelledby="contact-details-title">
                <div class="contact-section__header">
                        <span class="contact-eyebrow">Informations utiles</span>
                        <h2 class="contact-section__title" id="contact-details-title">Prépare ta demande</h2>
                        <p class="contact-section__description">Quelques détails facilitent notre réponse : indique ton numéro de commande, le support concerné ou les visuels que tu souhaites personnaliser.</p>
                </div>
                <div class="contact-details__grid">
                        <div class="contact-details__item">
                                <h3>Horaires du support</h3>
                                <ul class="contact-list">
                                        <li><strong>Lun - Ven :</strong> 9h00 &ndash; 18h00 (CET)</li>
                                        <li><strong>Samedi :</strong> 10h00 &ndash; 14h00 (CET)</li>
                                        <li><strong>Urgence boutique :</strong> Priorité sous 4h ouvrées</li>
                                </ul>
                        </div>
                        <div class="contact-details__item">
                                <h3>Adresse studio</h3>
                                <p>Customiizer Studio<br/>24 rue des Créateurs<br/>75010 Paris &ndash; France</p>
                                <p class="contact-details__note">Sur rendez-vous uniquement pour les projets professionnels.</p>
                        </div>
                        <div class="contact-details__item">
                                <h3>Avant de nous écrire</h3>
                                <ul class="contact-tips">
                                        <li><i class="fas fa-check" aria-hidden="true"></i> Vérifie que ton adresse e-mail est correcte.</li>
                                        <li><i class="fas fa-check" aria-hidden="true"></i> Ajoute des captures ou liens utiles (Drive, Dropbox…).</li>
                                        <li><i class="fas fa-check" aria-hidden="true"></i> Précise le produit ou la collection concernés.</li>
                                </ul>
                        </div>
                </div>
        </section>

        <section class="contact-form-section contact-section" id="contact-form" aria-labelledby="contact-form-title">
                <div class="contact-form__intro">
                        <span class="contact-eyebrow">Formulaire</span>
                        <h2 class="contact-section__title" id="contact-form-title">Écris-nous un message</h2>
                        <p class="contact-section__description">Nous revenons vers toi rapidement avec une réponse personnalisée. N'oublie pas de préciser l'objet de ta demande.</p>
                </div>
                <div class="contact-form__wrapper">
                        <?php echo do_shortcode('[contact-form-7 id="b4c0fb8" title="Contact form 1"]'); ?>
                </div>
                <p class="contact-form__privacy">En envoyant ce formulaire, tu acceptes que Customiizer traite tes informations pour répondre à ta demande. Consulte notre <a href="<?php echo esc_url( home_url( '/confidentialite' ) ); ?>">politique de confidentialité</a>.</p>
        </section>
</main>

<?php
get_footer();
?>
