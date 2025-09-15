<?php
/**
 * REST endpoints for variant->product mapping.
 */

register_rest_route('api/v1/products', '/variant-map', [
    'methods' => 'GET',
    'callback' => function() {
        $data = customiizer_get_variant_product_map();
        return new WP_REST_Response($data, 200);
    },
    'permission_callback' => '__return_true',
]);

register_rest_route('api/v1/products', '/variant-map/refresh', [
    'methods' => 'POST',
    'callback' => function() {
        $data = customiizer_refresh_variant_product_map();
        return new WP_REST_Response($data, 200);
    },
    'permission_callback' => function () {
        return current_user_can('manage_options');
    },
]);
