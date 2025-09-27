<?php
if (defined('WP_DEBUG') && WP_DEBUG) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}

define('WP_USE_THEMES', false);
$logContext = 'webhook_progress';

require_once dirname(__FILE__) . '/../../utilities.php';

$inputJSON = file_get_contents('php://input');
if ($inputJSON === false) {
    customiizer_log($logContext, "Erreur : Impossible de lire l'entrée JSON.");
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => "Impossible de lire l'entrée JSON.",
    ]);
    exit;
}

customiizer_log($logContext, 'Payload reçu: ' . $inputJSON);

$data = json_decode($inputJSON, true);
if (!is_array($data) || json_last_error() !== JSON_ERROR_NONE) {
    customiizer_log($logContext, 'Erreur de décodage JSON: ' . json_last_error_msg());
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'JSON invalide.',
    ]);
    exit;
}

$requiredKeys = ['jobId', 'mjHash', 'progress'];
foreach ($requiredKeys as $key) {
    if (!array_key_exists($key, $data)) {
        customiizer_log($logContext, "Champ manquant: {$key}");
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => sprintf('Champ %s manquant.', $key),
        ]);
        exit;
    }
}

$wp_load_path = dirname(__FILE__, 5) . '/wp-load.php';
if (!file_exists($wp_load_path)) {
    customiizer_log($logContext, 'Erreur : wp-load.php introuvable.');
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'wp-load.php introuvable.',
    ]);
    exit;
}

require_once $wp_load_path;

$jobId = (int) $data['jobId'];
$progressValue = is_numeric($data['progress']) ? (float) $data['progress'] : sanitize_text_field($data['progress']);

if ($jobId <= 0) {
    customiizer_log($logContext, "Identifiant de job invalide: {$jobId}");
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Identifiant de job invalide.',
    ]);
    exit;
}

global $wpdb;
$jobsTable = 'WPC_generation_jobs';
$now = current_time('mysql');

$updateData = [
    'progress' => $progressValue,
    'updated_at' => $now,
];

$updateFormats = [
    is_float($progressValue) ? '%f' : '%s',
    '%s',
];

$result = $wpdb->update(
    $jobsTable,
    $updateData,
    ['id' => $jobId],
    $updateFormats,
    ['%d']
);

if ($result === false) {
    customiizer_log($logContext, 'Erreur mise à jour SQL: ' . $wpdb->last_error);
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Échec de la mise à jour du progrès.',
    ]);
    exit;
}

if ($result === 0) {
    customiizer_log($logContext, "Aucun job trouvé pour l'identifiant {$jobId}");
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Job introuvable.',
    ]);
    exit;
}

header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'jobId' => $jobId,
    'progress' => $progressValue,
]);
customiizer_log($logContext, sprintf('Progression mise à jour pour job %d : %s', $jobId, (string) $progressValue));
exit;
