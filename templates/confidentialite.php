<?php
/*
Template Name: Politique de confidentialité
*/
get_header();

wp_enqueue_style('legal-global', get_stylesheet_directory_uri() . '/styles/legal-global.css');
?>

<main id="site-content" class="site-content">
    <section class="legal-content">
        <div class="container">
            <h1>Politique de confidentialité</h1>

            <h2>1. Introduction</h2>
            <p>La présente politique de confidentialité a pour but d’informer les utilisateurs du site Customiizer sur la manière dont leurs données personnelles sont collectées, utilisées et protégées, conformément au Règlement Général sur la Protection des Données (RGPD).</p>

            <h2>2. Données collectées</h2>
            <p>Nous collectons les données suivantes lors de l'utilisation du site : nom, adresse e-mail, adresse de livraison, informations de paiement, contenu personnalisé fourni (texte, image), ainsi que des données techniques (adresse IP, type de navigateur, temps de connexion, etc.).</p>

            <h2>3. Finalités du traitement</h2>
            <p>Les données sont utilisées pour :<br>
            – Traiter les commandes et assurer la livraison<br>
            – Gérer la relation client et le support<br>
            – Améliorer le fonctionnement du site<br>
            – Respecter nos obligations légales et fiscales</p>

            <h2>4. Consentement et droits</h2>
            <p>En utilisant notre site, vous consentez à cette collecte. Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition. Pour exercer vos droits, contactez-nous à <a href="mailto:community@customiizer.com">community@customiizer.com</a>.</p>

            <h2>5. Durée de conservation</h2>
            <p>Vos données sont conservées pendant toute la durée de notre relation commerciale et pendant une durée raisonnable ensuite, sauf obligation légale contraire.</p>

            <h2>6. Partage des données</h2>
            <p>Les données ne sont jamais revendues. Elles peuvent être transmises à des prestataires techniques (impression, livraison, hébergement) uniquement dans le cadre du traitement de votre commande et sous engagement de confidentialité.</p>

            <h2>7. Cookies</h2>
            <p>Pour plus d'informations sur l'utilisation des cookies, veuillez consulter notre <a href="/cookies">politique de gestion des cookies</a>.</p>

            <h2>8. Sécurité</h2>
            <p>Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos données personnelles contre la perte, l'accès non autorisé ou toute forme de traitement illicite.</p>

            <h2>9. Modifications</h2>
            <p>Cette politique peut être mise à jour à tout moment. En cas de modification substantielle, les utilisateurs en seront informés par e-mail ou via une notification sur le site.</p>

            <h2>10. Contact</h2>
            <p>Pour toute question relative à cette politique, vous pouvez écrire à <a href="mailto:community@customiizer.com">community@customiizer.com</a>.</p>
        </div>
    </section>
</main>

<?php get_footer(); ?>
