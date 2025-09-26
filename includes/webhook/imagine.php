<?php
// Activer l'affichage des erreurs pour le débogage uniquement en mode developpement
if (defined('WP_DEBUG') && WP_DEBUG) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}

define('WP_USE_THEMES', false);
$wp_load_path = dirname(__FILE__) . '/../../../../../wp-load.php';
$logContext = 'webhook_imagine';

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
    customiizer_log($logContext, 'Erreur de décodage JSON: ' . json_last_error_msg());
    http_response_code(400);
    echo wp_json_encode(['status' => 'error', 'message' => 'JSON mal formé.']);
    exit;
}

if (!is_array($input) || empty($input['hash'])) {
    customiizer_log($logContext, 'Structure de données invalide: ' . print_r($input, true));
    http_response_code(400);
    echo wp_json_encode(['status' => 'error', 'message' => 'Structure de données invalide']);
    exit;
}

$taskHash = sanitize_text_field($input['hash']);
$now = current_time('mysql');
$status = isset($input['status']) ? strtolower(sanitize_text_field($input['status'])) : '';

global $wpdb;
$jobsTable = 'WPC_generation_jobs';
$imagesTable = 'WPC_generated_image';

$job = $wpdb->get_row(
    $wpdb->prepare("SELECT id, user_id, prompt, settings FROM {$jobsTable} WHERE task_id = %s", $taskHash),
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

$result = isset($input['result']) && is_array($input['result']) ? $input['result'] : [];
$imageUrl = isset($result['url']) ? esc_url_raw($result['url']) : '';
$imageHandled = false;

if ($imageUrl !== '') {
    $existing = $wpdb->get_var(
        $wpdb->prepare(
            "SELECT COUNT(*) FROM {$imagesTable} WHERE job_id = %d AND image_url = %s",
            (int) $job['id'],
            $imageUrl
        )
    );

    $width = isset($result['width']) ? absint($result['width']) : 0;
    $height = isset($result['height']) ? absint($result['height']) : 0;
    $format = ($width > 0 && $height > 0) ? sprintf('%dx%d', $width, $height) : '';

    if (!$existing) {
        $nextNumber = (int) $wpdb->get_var("SELECT MAX(image_number) FROM {$imagesTable}");
        $nextNumber = $nextNumber ? $nextNumber + 1 : 1;

        $settingsValue = '';
        if (isset($job['settings'])) {
            $settingsValue = is_string($job['settings']) ? $job['settings'] : wp_json_encode($job['settings']);
        }

        $data = [
            'image_number' => $nextNumber,
            'job_id' => (int) $job['id'],
            'user_id' => (int) $job['user_id'],
            'image_url' => $imageUrl,
            'prompt' => isset($job['prompt']) ? sanitize_text_field($job['prompt']) : '',
            'settings' => $settingsValue,
        ];

        $formats = ['%d', '%d', '%d', '%s', '%s', '%s'];

        if ($format !== '') {
            $data['format_image'] = $format;
            $formats[] = '%s';
        }

        $data['image_date'] = $now;
        $formats[] = '%s';

        $inserted = $wpdb->insert($imagesTable, $data, $formats);

        if ($inserted === false) {
            customiizer_log($logContext, 'Erreur insertion image : ' . $wpdb->last_error);
            http_response_code(500);
            echo wp_json_encode(['status' => 'error', 'message' => "Échec de l'enregistrement de l'image"]);
            exit;
        }

        customiizer_log($logContext, "Image enregistrée pour le job {$job['id']} (image_number {$nextNumber})");
    } else {
        customiizer_log($logContext, "Image déjà enregistrée pour le job {$job['id']}");
    }

    $imageHandled = true;
}

if ($imageHandled) {
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
    'message' => $imageHandled ? 'Image enregistrée' : 'Statut mis à jour',
]);
