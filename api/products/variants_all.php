<?php
register_rest_route('api/v1/products', '/variants_all', [
    'methods' => 'GET',
    'callback' => 'get_all_product_variants_basic',
    'permission_callback' => '__return_true',
]);

function get_all_product_variants_basic() {
    global $wpdb;
    $prefix = 'WPC_';

    $query = "SELECT product_id, variant_id, size, ratio_image, color, hexa FROM {$prefix}variants";
    $results = $wpdb->get_results($query, ARRAY_A);

    if (empty($results)) {
        return new WP_REST_Response([], 200);
    }

    $formatted = array_map(function($row) {
        return [
            'product_id'  => (int)$row['product_id'],
            'variant_id'  => (int)$row['variant_id'],
            'size'        => $row['size'],
            'ratio_image' => $row['ratio_image'],
            'color'       => $row['color'],
            'hexa'        => $row['hexa'],
        ];
    }, $results);

    return new WP_REST_Response($formatted, 200);
}
