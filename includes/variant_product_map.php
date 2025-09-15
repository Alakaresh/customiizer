<?php
/**
 * Variant to product mapping utilities.
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Retrieve the variant->product mapping from cache or rebuild if necessary.
 *
 * @return array{map: array<int,int>, last_updated: int}
 */
function customiizer_get_variant_product_map() {
    if (function_exists('apcu_fetch')) {
        $cached = apcu_fetch('customiizer_variant_product_map', $success);
        if ($success && is_array($cached) && isset($cached['map'])) {
            return $cached;
        }
    }

    $file = get_stylesheet_directory() . '/variant_product_map.json';
    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true);
        if (is_array($data) && isset($data['map'])) {
            if (function_exists('apcu_store')) {
                apcu_store('customiizer_variant_product_map', $data, 3600);
            }
            return $data;
        }
    }

    return customiizer_refresh_variant_product_map();
}

/**
 * Rebuild the variant->product mapping and store it in cache and JSON file.
 *
 * @return array{map: array<int,int>, last_updated: int}
 */
function customiizer_refresh_variant_product_map() {
    global $wpdb;
    $prefix = 'WPC_';

    $rows = $wpdb->get_results("SELECT variant_id, product_id FROM {$prefix}variants", ARRAY_A);
    $map = [];
    foreach ($rows as $row) {
        $map[(int)$row['variant_id']] = (int)$row['product_id'];
    }

    $data = [
        'last_updated' => time(),
        'map' => $map,
    ];

    if (function_exists('apcu_store')) {
        apcu_store('customiizer_variant_product_map', $data, 3600);
    }

    $file = get_stylesheet_directory() . '/variant_product_map.json';
    file_put_contents($file, json_encode($data));

    return $data;
}

add_action('init', function () {
    customiizer_get_variant_product_map();
});
