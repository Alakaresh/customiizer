<?php
/**
 * Main content for the boutique page.
 *
 * @package Customiizer
 */
?>

<div class="shop-page" aria-labelledby="shop-hero-title">
        <section class="shop-hero">
                <div class="shop-hero__inner surface-card">
                        <div class="shop-hero__content">
                                <span class="shop-eyebrow">Boutique Customiizer</span>
                                <h1 class="shop-hero__title" id="shop-hero-title">Des supports prêts à devenir uniques</h1>
                                <p class="shop-hero__description">Découvre une sélection de produits premium imaginés pour accueillir tes créations. Combine l'intelligence artificielle et notre configurateur pour transformer chaque idée en pièce exclusive.</p>
                                <div class="shop-hero__actions">
                                        <a href="#shop-products" class="shop-button shop-button--primary">
                                                <i class="fas fa-store" aria-hidden="true"></i>
                                                <span>Explorer les supports</span>
                                        </a>
                                        <a href="<?php echo esc_url( home_url( '/customiize' ) ); ?>" class="shop-button shop-button--ghost">
                                                <i class="fas fa-magic" aria-hidden="true"></i>
                                                <span>Créer avec l'IA</span>
                                        </a>
                                </div>
                                <ul class="shop-hero__metrics" aria-label="Chiffres clés de la boutique">
                                        <li class="shop-metric">
                                                <span class="shop-metric__value">+120</span>
                                                <span class="shop-metric__label">Supports disponibles</span>
                                        </li>
                                        <li class="shop-metric">
                                                <span class="shop-metric__value">48h</span>
                                                <span class="shop-metric__label">Production moyenne</span>
                                        </li>
                                        <li class="shop-metric">
                                                <span class="shop-metric__value">4.9/5</span>
                                                <span class="shop-metric__label">Satisfaction clients</span>
                                        </li>
                                </ul>
                        </div>
                        <div class="shop-hero__visual" aria-hidden="true">
                                <div class="shop-hero__orb shop-hero__orb--primary"></div>
                                <div class="shop-hero__orb shop-hero__orb--secondary"></div>
                        </div>
                </div>
        </section>

        <section class="shop-section shop-section--filters surface-card" aria-labelledby="shop-filters-title">
                <div class="shop-section__header">
                        <div class="shop-section__heading">
                                <span class="shop-eyebrow">Trouve ton support</span>
                                <h2 class="shop-section__title" id="shop-filters-title">Un catalogue pensé pour ta créativité</h2>
                        </div>
                        <p class="shop-section__description">Navigue parmi nos catégories pour découvrir les supports qui sublimeront tes idées : textiles, déco, accessoires et bien plus encore.</p>
                </div>
                <div class="shop-tags" role="list">
                        <span class="shop-tag shop-tag--active" role="listitem">Tout voir</span>
                        <span class="shop-tag" role="listitem">Textile</span>
                        <span class="shop-tag" role="listitem">Décoration</span>
                        <span class="shop-tag" role="listitem">Lifestyle</span>
                        <span class="shop-tag" role="listitem">Nouveautés</span>
                        <span class="shop-tag" role="listitem">Éditions limitées</span>
                </div>
        </section>

        <section class="shop-section shop-section--products surface-card" id="shop-products" aria-labelledby="shop-products-title">
                <div class="shop-section__header">
                        <div class="shop-section__heading">
                                <span class="shop-eyebrow">Catalogue</span>
                                <h2 class="shop-section__title" id="shop-products-title">Produits personnalisables</h2>
                        </div>
                        <p class="shop-section__description">Sélectionne un support pour ouvrir le configurateur et le transformer en pièce unique grâce à nos outils de personnalisation et à l’IA.</p>
                </div>
                <div class="product-list" role="list" aria-live="polite">
                        <!-- Les cartes produits sont injectées en JavaScript -->
                </div>
        </section>

        <section class="shop-section shop-section--highlights surface-card" aria-labelledby="shop-highlights-title">
                <div class="shop-section__header">
                        <div class="shop-section__heading">
                                <span class="shop-eyebrow">Pourquoi nous choisir</span>
                                <h2 class="shop-section__title" id="shop-highlights-title">Une expérience fluide de l’idée au produit</h2>
                        </div>
                        <p class="shop-section__description">Customiizer t’accompagne à chaque étape : génération d’idées, personnalisation poussée et production premium.</p>
                </div>
                <div class="shop-highlights__grid">
                        <article class="shop-highlight-card">
                                <div class="shop-highlight-card__icon" aria-hidden="true"><i class="fas fa-palette"></i></div>
                                <h3 class="shop-highlight-card__title">Création guidée</h3>
                                <p class="shop-highlight-card__text">Bénéficie de prompts assistés et de recommandations IA pour imaginer des visuels impactants en quelques secondes.</p>
                        </article>
                        <article class="shop-highlight-card">
                                <div class="shop-highlight-card__icon" aria-hidden="true"><i class="fas fa-cubes"></i></div>
                                <h3 class="shop-highlight-card__title">Aperçus immersifs</h3>
                                <p class="shop-highlight-card__text">Visualise ton produit en 3D et ajuste chaque détail pour un rendu fidèle avant même la mise en production.</p>
                        </article>
                        <article class="shop-highlight-card">
                                <div class="shop-highlight-card__icon" aria-hidden="true"><i class="fas fa-shipping-fast"></i></div>
                                <h3 class="shop-highlight-card__title">Qualité premium</h3>
                                <p class="shop-highlight-card__text">Nos partenaires de production garantissent des matériaux durables, une impression soignée et une livraison suivie.</p>
                        </article>
                </div>
        </section>
</div>
