<?php
/**
 * AJAX callback used to retrieve the list of generated images stored in the
 * database.
 */
function get_generated_images_ajax() {
    $images = customiizer_fetch_generated_images([
        'order_by' => 'image_date',
        'order'    => 'DESC',
    ]);

    if (!empty($images)) {
        wp_send_json_success([
            'images'  => $images,
            'message' => 'Images générées récupérées avec succès.',
        ]);
    }

    wp_send_json_error([
        'message' => 'Aucune image trouvée.'
    ], 404);
}

add_action('wp_ajax_nopriv_get_generated_images', 'get_generated_images_ajax');
add_action('wp_ajax_get_generated_images', 'get_generated_images_ajax');
