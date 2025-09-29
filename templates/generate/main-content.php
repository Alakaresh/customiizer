<!--
<div id="introScreen" class="intro" style="display:none">
	<div class="intro-content">
		<h1>Welcome to our image generator!</h1>
		<p>Click "Start Tutorial" to begin the tutorial or "Close" to start generating your first image without delay.</p>
		<button id="startTutorial">Start Tutorial</button>
		<button id="closeIntro">Close</button>
	</div>
</div>
-->

<div class="content-images" id="content-images">
        <div id="generation-progress-inline-wrapper" class="generation-progress-inline-wrapper" role="region" aria-live="polite" aria-hidden="true"></div>

        <section
                id="variant-display"
                class="variant-display is-hidden"
                role="region"
                aria-live="polite"
                aria-busy="false"
                aria-hidden="true"
        >
                <div class="variant-panel">
                        <header class="variant-panel__header">
                                <div class="variant-panel__heading">
                                        <p class="variant-panel__eyebrow">Sélection</p>
                                        <h2 class="variant-panel__title">Choisissez votre modèle</h2>
                                        <p class="variant-panel__description">
                                                Explorez les produits disponibles et sélectionnez la variante idéale pour vos visuels générés.
                                        </p>
                                </div>
                                <button
                                        type="button"
                                        class="variant-panel__close"
                                        onclick="toggleRatioMenu(false)"
                                        aria-label="Fermer la sélection de produit"
                                >
                                        Fermer
                                </button>
                        </header>

                        <div class="variant-panel__content">
                                <aside class="variant-panel__sidebar" aria-labelledby="product-list-label">
                                        <h3 id="product-list-label" class="variant-panel__sidebar-title">Produits</h3>
                                        <p class="variant-panel__sidebar-description">
                                                Explorez les formats recommandés pour chaque produit en un clin d'œil.
                                        </p>
                                        <div id="product-container" class="variant-panel__product-list-wrapper">
                                                <div id="product-list" class="variant-panel__product-list" role="list" aria-labelledby="product-list-label"></div>
                                        </div>
                                </aside>

                                <div
                                        id="product-groups-container"
                                        class="product-groups is-hidden"
                                        role="list"
                                        data-variant-container
                                        aria-busy="false"
                                ></div>
                        </div>
                </div>
        </section>

       <div class="grid-wrapper generation-display" id="image-grid-wrapper">
               <div
                       id="generation-placeholder-grid"
                       class="generation-placeholder-grid"
                       role="list"
                       aria-hidden="false"
               >
                       <div class="image-container" role="listitem">
                               <img src="https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png" alt="Image d'attente" />
                       </div>
                       <div class="image-container" role="listitem">
                               <img src="https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png" alt="Image d'attente" />
                       </div>
                       <div class="image-container" role="listitem">
                               <img src="https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png" alt="Image d'attente" />
                       </div>
                       <div class="image-container" role="listitem">
                               <img src="https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png" alt="Image d'attente" />
                       </div>
               </div>

               <div id="generation-gallery" class="generation-gallery is-hidden" aria-hidden="true">
                       <div id="generation-preview" class="generation-preview" aria-live="polite">
                               <img
                                       id="generation-preview-image"
                                       class="centered-image"
                                       src="https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png"
                                       alt="Image d'attente"
                               />
                       </div>

                       <div id="generation-thumbnails" class="image-grid generation-thumbnails" role="list">
                               <button type="button" class="image-container generation-thumbnail is-placeholder" data-thumbnail-index="0" aria-label="Miniature 1">
                                       <img src="https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png" alt="Image d'attente" />
                               </button>
                               <button type="button" class="image-container generation-thumbnail is-placeholder" data-thumbnail-index="1" aria-label="Miniature 2">
                                       <img src="https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png" alt="Image d'attente" />
                               </button>
                               <button type="button" class="image-container generation-thumbnail is-placeholder" data-thumbnail-index="2" aria-label="Miniature 3">
                                       <img src="https://customiizer.blob.core.windows.net/assets/SiteDesign/img/attente.png" alt="Image d'attente" />
                               </button>
                       </div>
               </div>
       </div>
</div>
