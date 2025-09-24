<?php
/*
Template Name: Contact
*/
get_header();
?>

<main id="site-content" class="site-content">
	<section class="contact-section">
		<h2>Une question ?</h2>
		<p>Nous sommes là pour vous aider. Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.</p>


            <div class="contact-form">
                    <form class="contact-form__form" action="#" method="post">
                            <div class="contact-form__grid">
                                    <div class="contact-form__field">
                                            <label for="contact-first-name">Prénom</label>
                                            <input type="text" id="contact-first-name" name="first_name" placeholder="Votre prénom" required />
                                    </div>
                                    <div class="contact-form__field">
                                            <label for="contact-last-name">Nom</label>
                                            <input type="text" id="contact-last-name" name="last_name" placeholder="Votre nom" required />
                                    </div>
                                    <div class="contact-form__field">
                                            <label for="contact-email">E-mail</label>
                                            <input type="email" id="contact-email" name="email" placeholder="votreadresse@email.com" required />
                                    </div>
                                    <div class="contact-form__field">
                                            <label for="contact-phone">Téléphone</label>
                                            <input type="tel" id="contact-phone" name="phone" placeholder="Votre numéro de téléphone" />
                                    </div>
                            </div>

                            <div class="contact-form__field">
                                    <label for="contact-subject">Sujet</label>
                                    <input type="text" id="contact-subject" name="subject" placeholder="Sujet de votre message" required />
                            </div>

                            <div class="contact-form__field">
                                    <label for="contact-message">Message</label>
                                    <textarea id="contact-message" name="message" placeholder="Votre message" rows="6" required></textarea>
                            </div>

                            <div class="contact-form__actions">
                                    <button type="submit" class="button button--primary">Envoyer</button>
                            </div>
                    </form>
            </div>
        </section>
</main>

<?php
get_footer();
?>
