<?php
function get_all_site_products() {
    global $wpdb;

    // Récupère tous les produits
    $products = $wpdb->get_results("SELECT * FROM `WPC_site_product`", ARRAY_A);

    // ✅ Toujours retourner un tableau, même vide
    wp_send_json($products);
}


add_action('wp_ajax_nopriv_get_all_site_products', 'get_all_site_products');
add_action('wp_ajax_get_all_site_products', 'get_all_site_products');

function get_product_ratios() {
    global $wpdb;

    $results = $wpdb->get_results("
        SELECT 
            p.product_id,
            p.name AS product_name,
            v.variant_id,
            v.size,
            v.ratio_image,
            m.image
        FROM WPC_products p
        INNER JOIN WPC_variants v ON p.product_id = v.product_id
        LEFT JOIN WPC_variant_mockup m ON v.variant_id = m.variant_id
        WHERE p.is_active = 1
        ORDER BY v.ratio_image ASC
    ", ARRAY_A);

    if (!empty($results)) {
        wp_send_json($results);
    } else {
        wp_send_json(['message' => 'Aucun produit trouvé.']);
    }
}


add_action('wp_ajax_get_product_ratios', 'get_product_ratios');
add_action('wp_ajax_nopriv_get_product_ratios', 'get_product_ratios');
