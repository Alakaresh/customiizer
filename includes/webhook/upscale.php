<?php
if (defined('WP_DEBUG') && WP_DEBUG) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}

define('WP_USE_THEMES', false);
$wp_load_path = dirname(__FILE__) . '/../../../../../wp-load.php';
$logContext = 'webhook_upscale';

require_once dirname(__FILE__) . '/../../utilities.php';

if (file_exists($wp_load_path)) {
    require_once $wp_load_path;
} else {
    customiizer_log($logContext, 'Erreur : wp-load.php introuvable.');
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'wp-load.php not found']);
    exit;
}

$inputJSON = file_get_contents('php://input');
if ($inputJSON === false) {
    customiizer_log($logContext, "Erreur : Impossible de lire l'entrée JSON.");
    http_response_code(500);
    echo wp_json_encode(['status' => 'error', 'message' => "Impossible de lire l'entrée JSON."]);
    exit;
}

$input = json_decode($inputJSON, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    customiizer_log($logContext, 'Erreur JSON: ' . json_last_error_msg());
    http_response_code(400);
    echo wp_json_encode(['status' => 'error', 'message' => 'JSON mal formé.']);
    exit;
}

if (!is_array($input) || empty($input['hash'])) {
    customiizer_log($logContext, 'Hash manquant dans la requête.');
    http_response_code(400);
    echo wp_json_encode(['status' => 'error', 'message' => 'Hash manquant dans la requête.']);
    exit;
}

$taskHash = sanitize_text_field($input['hash']);
$now = current_time('mysql');
$status = isset($input['status']) ? strtolower(sanitize_text_field($input['status'])) : '';

global $wpdb;
$jobsTable = 'WPC_generation_jobs';
$imagesTable = 'WPC_generated_image';

$job = $wpdb->get_row(
    $wpdb->prepare("SELECT id, user_id, prompt, format_image FROM {$jobsTable} WHERE task_id = %s", $taskHash),
    ARRAY_A
);

if (!$job) {
    customiizer_log($logContext, "Job introuvable pour le hash {$taskHash}");
    http_response_code(404);
    echo wp_json_encode(['status' => 'error', 'message' => 'Job introuvable']);
    exit;
}

if ($status === 'error' || isset($input['error'])) {
    $wpdb->update(
        $jobsTable,
        [
            'status' => 'error',
            'updated_at' => $now,
        ],
        ['id' => (int) $job['id']],
        ['%s', '%s'],
        ['%d']
    );

    customiizer_log($logContext, "Job {$job['id']} marqué en erreur");
    http_response_code(200);
    echo wp_json_encode(['status' => 'error', 'message' => 'Job marqué en erreur']);
    exit;
}

$wpdb->update(
    $jobsTable,
    [
        'status' => 'processing',
        'updated_at' => $now,
    ],
    ['id' => (int) $job['id']],
    ['%s', '%s'],
    ['%d']
);

$variants = [];

if (isset($input['variants']) && is_array($input['variants'])) {
    foreach ($input['variants'] as $variant) {
        if (is_array($variant) && isset($variant['url'])) {
            $variants[] = [
                'choice' => isset($variant['choice']) ? (int) $variant['choice'] : null,
                'data' => $variant,
            ];
        }
    }
}

$result = isset($input['result']) && is_array($input['result']) ? $input['result'] : [];

if (isset($result['url'])) {
    $variants[] = [
        'choice' => isset($input['choice']) ? (int) $input['choice'] : null,
        'data' => $result,
    ];
} elseif ($result) {
    foreach ($result as $key => $variant) {
        if (is_array($variant) && isset($variant['url'])) {
            $choice = null;
            if (isset($variant['choice'])) {
                $choice = (int) $variant['choice'];
            } elseif (isset($input['choice'])) {
                $choice = (int) $input['choice'];
            } elseif (is_numeric($key)) {
                $choice = (int) $key + 1;
            }

            $variants[] = [
                'choice' => $choice,
                'data' => $variant,
            ];
        }
    }
}

$variants = array_slice($variants, 0, 4);

$promptValue = isset($job['prompt']) ? sanitize_text_field($job['prompt']) : '';
$insertedVariant = false;

foreach ($variants as $variant) {
    $choice = isset($variant['choice']) ? max(1, min(4, (int) $variant['choice'])) : null;
    $data = is_array($variant['data']) ? $variant['data'] : [];
    $imageUrl = isset($data['url']) ? esc_url_raw($data['url']) : '';

    if ($imageUrl === '') {
        continue;
    }

    $existing = $wpdb->get_var(
        $wpdb->prepare(
            "SELECT COUNT(*) FROM {$imagesTable} WHERE job_id = %d AND image_url = %s",
            (int) $job['id'],
            $imageUrl
        )
    );

    if ($existing) {
        customiizer_log($logContext, "Image déjà enregistrée pour le job {$job['id']} (choice {$choice})");
        $insertedVariant = true;
        continue;
    }

    $width = isset($data['width']) ? absint($data['width']) : 0;
    $height = isset($data['height']) ? absint($data['height']) : 0;
    $format = !empty($job['format_image']) ? sanitize_text_field($job['format_image']) : '';
    if ($format === '' && $width > 0 && $height > 0) {
        $format = sprintf('%dx%d', $width, $height);
    }

    $nextNumber = (int) $wpdb->get_var("SELECT MAX(image_number) FROM {$imagesTable}");
    $nextNumber = $nextNumber ? $nextNumber + 1 : 1;

    $imageData = [
        'image_number' => $nextNumber,
        'job_id' => (int) $job['id'],
        'user_id' => (int) $job['user_id'],
        'image_url' => $imageUrl,
        'prompt' => $promptValue,
        'settings' => '',
    ];

    $formats = ['%d', '%d', '%d', '%s', '%s', '%s'];

    if ($choice !== null) {
        $imageData['image_prefix'] = 'choice_' . $choice;
        $formats[] = '%s';
    }

    if ($format !== '') {
        $imageData['format_image'] = $format;
        $formats[] = '%s';
    }

    $imageData['image_date'] = $now;
    $formats[] = '%s';

    $insertResult = $wpdb->insert($imagesTable, $imageData, $formats);

    if ($insertResult === false) {
        customiizer_log($logContext, 'Erreur insertion image : ' . $wpdb->last_error);
        http_response_code(500);
        echo wp_json_encode(['status' => 'error', 'message' => "Échec de l'enregistrement de l'image"]);
        exit;
    }

    customiizer_log($logContext, "Variante enregistrée pour le job {$job['id']} (choice {$choice}, image_number {$nextNumber})");
    $insertedVariant = true;
}

if ($insertedVariant) {
    $wpdb->update(
        $jobsTable,
        [
            'status' => 'done',
            'updated_at' => $now,
        ],
        ['id' => (int) $job['id']],
        ['%s', '%s'],
        ['%d']
    );
}

http_response_code(200);
echo wp_json_encode([
    'status' => 'success',
    'message' => $insertedVariant ? 'Variantes enregistrées' : 'Statut mis à jour',
]);

