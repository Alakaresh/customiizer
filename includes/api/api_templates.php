<?php
// 📦 API : récupérer un template à partir d'un variant_id
function get_variant_template_by_id($request) {
    global $wpdb;

    $variant_id = intval($request['variant_id']);
    $prefix = 'WPC_'; // Ton préfixe personnalisé

    $cached = get_transient('variant_tpl_' . $variant_id);
    if (false !== $cached) {
        return new WP_REST_Response([
            'success' => true,
            'template' => $cached
        ], 200);
    }

    $result = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$prefix}variant_templates
        WHERE variant_id = %d
        LIMIT 1",
        $variant_id
    ), ARRAY_A);

    if (!$result) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Aucun template trouvé pour ce variant_id.'
        ], 404);
    }

    set_transient('variant_tpl_' . $variant_id, $result, HOUR_IN_SECONDS);

    return new WP_REST_Response([
        'success' => true,
        'template' => $result
    ], 200);
}

// 🔗 Enregistrement de l’endpoint REST
add_action('rest_api_init', function () {
    register_rest_route('custom-api/v1', '/variant-template/(?P<variant_id>\d+)', [
        'methods' => 'GET',
        'callback' => 'get_variant_template_by_id',
        'permission_callback' => 'customiizer_api_permissions',
    ]);
});
