<!-- IMAGES -->
<div class="content-container">
        <section id="image-container" class="file-library-gallery" aria-live="polite">
                <div id="account-images-grid" class="file-list grid-view" role="list"></div>
                <div id="account-images-empty" class="file-library-empty" role="status" hidden>
                        <p class="file-library-empty-title"><?php esc_html_e( 'Aucune image à afficher', 'customiizer' ); ?></p>
                        <p id="account-images-empty-text" class="file-library-empty-message"><?php esc_html_e( 'Vos créations apparaîtront ici après vos premières générations.', 'customiizer' ); ?></p>
                </div>
                <nav id="account-images-pagination" class="pagination-container" aria-label="<?php esc_attr_e( 'Pagination des images', 'customiizer' ); ?>"></nav>
        </section>
</div>
<!-- Scripts moved to assets.php -->
