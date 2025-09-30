<?php
add_action('rest_api_init', function() {
    register_rest_route('custom-api/v1', '/generated-images/', [
        'methods'             => 'GET',
        'callback'            => 'customiizer_rest_get_generated_images',
        'permission_callback' => '__return_true',
    ]);
});

/**
 * Récupère toutes les images générées avec pagination et filtres.
 */
function customiizer_rest_get_generated_images(WP_REST_Request $request) {
    $userIdParam    = $request->get_param('user_id');
    $formatParam    = $request->get_param('format_image');
    $dateFromParam  = $request->get_param('date_from');
    $dateToParam    = $request->get_param('date_to');
    $limitParam     = $request->get_param('limit');

    $limit = is_scalar($limitParam) ? (int) $limitParam : 100;
    if ($limit <= 0) {
        $limit = 100;
    }
    $limit = min($limit, 500);

    $queryArgs = [
        'order_by' => 'image_date',
        'order'    => 'DESC',
        'limit'    => $limit,
        'fields'   => [
            'image_number',
            'user_id',
            'user_login',
            'upscaled_id',
            'source_id',
            'image_date',
            'image_prefix',
            'image_url',
            'picture_likes_nb',
            'format_image',
            'prompt',
            'settings',
            'job_id',
        ],
    ];

    $userId = is_scalar($userIdParam) ? (int) $userIdParam : null;
    if ($userId) {
        $queryArgs['user_id'] = $userId;
    } else {
        $queryArgs['random'] = true;
    }

    if (is_string($formatParam) && $formatParam !== '') {
        $queryArgs['format'] = sanitize_text_field(wp_unslash($formatParam));
    }

    $dateFrom = customiizer_rest_sanitize_date_param($dateFromParam);
    if ($dateFrom) {
        $queryArgs['date_from'] = $dateFrom;
    }

    $dateTo = customiizer_rest_sanitize_date_param($dateToParam);
    if ($dateTo) {
        $queryArgs['date_to'] = $dateTo;
    }

    $images = customiizer_fetch_generated_images($queryArgs);

    if (empty($images)) {
        return new WP_REST_Response(['error' => 'Aucune image trouvée'], 404);
    }

    return new WP_REST_Response([
        'success' => true,
        'images'  => $images,
    ], 200);
}

function customiizer_rest_sanitize_date_param($value) {
    if (!is_string($value)) {
        return null;
    }

    $sanitized = trim(sanitize_text_field(wp_unslash($value)));

    if ($sanitized === '') {
        return null;
    }

    if (!preg_match('/^\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?$/', $sanitized)) {
        return null;
    }

    return $sanitized;
}
