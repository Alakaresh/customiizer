<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Returns the prefix applied to custom image-generation tables.
 *
 * @return string
 */
function customiizer_get_custom_table_prefix() {
    static $prefix = null;

    if ($prefix === null) {
        $prefix = 'WPC_';
        $filtered = apply_filters('customiizer_custom_table_prefix', $prefix);

        if (is_string($filtered) && $filtered !== '') {
            $prefix = $filtered;
        }
    }

    return $prefix;
}

/**
 * Returns the database tables used for image generation.
 *
 * @return array{jobs: string, images: string}
 */
function customiizer_get_generation_tables() {
    static $tables = null;

    if ($tables === null) {
        $prefix = customiizer_get_custom_table_prefix();
        $tables = [
            'jobs'   => $prefix . 'generation_jobs',
            'images' => $prefix . 'generated_image',
        ];
    }

    return $tables;
}

/**
 * Decodes the JSON settings stored on a generated image row.
 *
 * @param mixed $value Raw value stored in the database.
 *
 * @return array<mixed>|string
 */
function customiizer_decode_settings($value) {
    if ($value === '' || $value === null) {
        return [];
    }

    $decoded = json_decode($value, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
        return $decoded;
    }

    return $value;
}

/**
 * Normalizes a generated image row into a structured array consumed by the UI.
 *
 * @param array<string, mixed> $row
 *
 * @return array{id: int|null, jobId: int|null, url: string, format: string, prompt: string, prefix: string, settings: mixed}
 */
function customiizer_normalize_generated_image_row($row) {
    return [
        'id'       => isset($row['image_number']) ? (int) $row['image_number'] : null,
        'jobId'    => isset($row['job_id']) ? (int) $row['job_id'] : null,
        'url'      => $row['image_url'] ?? '',
        'format'   => $row['format_image'] ?? '',
        'prompt'   => $row['prompt'] ?? '',
        'prefix'   => $row['image_prefix'] ?? '',
        'settings' => customiizer_decode_settings($row['settings'] ?? ''),
    ];
}

/**
 * Retrieves generated images with optional filters.
 *
 * @param array<string, mixed> $args {
 *     @type int|null    $user_id   Limit to a specific user.
 *     @type int|null    $job_id    Limit to a specific job.
 *     @type string|null $format    Limit to a specific format_image value.
 *     @type string|null $date_from Lower bound date (inclusive, mysql datetime string).
 *     @type string|null $date_to   Upper bound date (inclusive, mysql datetime string).
 *     @type int|null    $limit     Maximum number of rows to return.
 *     @type bool        $random    Whether the result should be randomised.
 *     @type string      $order     Sort order (ASC or DESC).
 *     @type string      $order_by  Column used to order results (whitelisted).
 *     @type array<int, string> $fields Fields to select (defaults to a safe subset).
 *     @type bool        $normalize Whether the results should be normalized with
 *                                  {@see customiizer_normalize_generated_image_row}.
 * }
 *
 * @return array<int, array<string, mixed>>
 */
function customiizer_fetch_generated_images(array $args = []) {
    global $wpdb;

    $tables = customiizer_get_generation_tables();
    $table  = $tables['images'];

    $defaults = [
        'user_id'   => null,
        'job_id'    => null,
        'format'    => null,
        'date_from' => null,
        'date_to'   => null,
        'limit'     => null,
        'random'    => false,
        'order'     => 'DESC',
        'order_by'  => 'image_date',
        'fields'    => [
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
        'normalize' => false,
    ];

    $args = wp_parse_args($args, $defaults);

    $allowedOrderBy = ['image_date', 'image_number'];
    $orderBy        = in_array($args['order_by'], $allowedOrderBy, true) ? $args['order_by'] : 'image_date';
    $order          = strtoupper($args['order']) === 'ASC' ? 'ASC' : 'DESC';

    $fields = $args['fields'];
    if (!is_array($fields) || empty($fields)) {
        $fields = $defaults['fields'];
    }

    $safeFields = [];
    foreach ($fields as $field) {
        if (is_string($field) && preg_match('/^[A-Za-z0-9_]+$/', $field)) {
            $safeFields[] = $field;
        }
    }

    if (empty($safeFields)) {
        $safeFields = $defaults['fields'];
    }

    $select = implode(', ', $safeFields);

    $where  = ['1 = 1'];
    $values = [];

    if (!empty($args['user_id'])) {
        $where[]  = 'user_id = %d';
        $values[] = (int) $args['user_id'];
    }

    if (!empty($args['job_id'])) {
        $where[]  = 'job_id = %d';
        $values[] = (int) $args['job_id'];
    }

    if (!empty($args['format'])) {
        $where[]  = 'format_image = %s';
        $values[] = sanitize_text_field($args['format']);
    }

    if (!empty($args['date_from'])) {
        $where[]  = 'image_date >= %s';
        $values[] = sanitize_text_field($args['date_from']);
    }

    if (!empty($args['date_to'])) {
        $where[]  = 'image_date <= %s';
        $values[] = sanitize_text_field($args['date_to']);
    }

    $sql = "SELECT {$select} FROM {$table} WHERE " . implode(' AND ', $where);

    if ($args['random']) {
        $sql .= ' ORDER BY RAND()';
    } else {
        $sql .= " ORDER BY {$orderBy} {$order}";
    }

    if (!empty($args['limit'])) {
        $limit = max(1, (int) $args['limit']);
        $sql  .= ' LIMIT %d';
        $values[] = $limit;
    }

    if (!empty($values)) {
        $sql = $wpdb->prepare($sql, $values);
    }

    $results = $wpdb->get_results($sql, ARRAY_A);

    if (!$results) {
        return [];
    }

    if (!empty($args['normalize'])) {
        return array_map('customiizer_normalize_generated_image_row', $results);
    }

    return $results;
}
