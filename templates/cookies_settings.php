<?php
/*
Template Name: Gestion des cookies
*/
get_header();

wp_enqueue_style('legal-global', get_stylesheet_directory_uri() . '/styles/legal-global.css');
wp_enqueue_style('tablet-legal', get_stylesheet_directory_uri() . '/styles/responsive/tablet/legal.css');
wp_enqueue_style('mobile-legal', get_stylesheet_directory_uri() . '/styles/responsive/mobile/legal.css');
?>

<main id="site-content" class="site-content">
    <section class="legal-content">
        <div class="container">
            <h1>Politique de gestion des cookies</h1>

            <h2>1. Qu'est-ce qu'un cookie ?</h2>
            <p>Un cookie est un petit fichier texte déposé sur votre appareil (ordinateur, tablette ou smartphone) lors de la consultation d'un site internet. Il permet notamment de collecter des informations relatives à votre navigation et d’améliorer votre expérience utilisateur.</p>

            <h2>2. Utilisation des cookies sur Customiizer</h2>
            <p>Nous utilisons plusieurs types de cookies sur notre site :<br>
            – Cookies strictement nécessaires au fonctionnement du site (panier, connexion, navigation)<br>
            – Cookies de mesure d'audience (statistiques anonymes, via Google Analytics ou outils équivalents)<br>
            – Cookies de personnalisation (conservation des préférences utilisateur)</p>

            <h2>3. Consentement</h2>
            <p>Conformément à la législation européenne, les cookies non essentiels ne sont déposés qu'après obtention de votre consentement explicite via le bandeau de gestion des cookies présent sur notre site lors de votre première visite. Vous pouvez accepter, refuser ou personnaliser l'utilisation des cookies à tout moment.</p>

            <h2>4. Durée de conservation</h2>
            <p>Les cookies ont une durée de vie maximale de 13 mois à compter de leur dépôt sur votre appareil. Passé ce délai, ils sont automatiquement supprimés.</p>

            <h2>5. Gestion des cookies</h2>
            <p>Vous pouvez gérer vos préférences en cliquant sur le lien "Gérer mes cookies" en bas de page, ou via les paramètres de votre navigateur :</p>
            <ul>
                <li>Chrome : Paramètres > Confidentialité et sécurité > Cookies</li>
                <li>Firefox : Options > Vie privée et sécurité > Cookies</li>
                <li>Safari : Préférences > Confidentialité > Cookies</li>
                <li>Edge : Paramètres > Cookies et autorisations de site</li>
            </ul>

            <h2>6. Contact</h2>
            <p>Pour toute question relative à l'utilisation des cookies, vous pouvez nous contacter à <a href="mailto:community@customiizer.com">community@customiizer.com</a>.</p>
        </div>
    </section>
</main>

<?php get_footer(); ?>
