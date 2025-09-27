<?php
if (defined('WP_DEBUG') && WP_DEBUG) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}

define('WP_USE_THEMES', false);

$logContext = 'webhook_generation_callback';
$utilitiesPath = dirname(__FILE__) . '/../../utilities.php';
if (file_exists($utilitiesPath)) {
    require_once $utilitiesPath;
}

if (!function_exists('customiizer_log')) {
    function customiizer_log($context, $message = '') {
        error_log('[' . $context . '] ' . $message);
    }
}

$wpLoadPath = dirname(__FILE__) . '/../../../../../wp-load.php';

if (file_exists($wpLoadPath)) {
    require_once $wpLoadPath;
} else {
    customiizer_log($logContext, 'wp-load.php introuvable');
    http_response_code(500);
    echo wp_json_encode(['success' => false, 'message' => 'wp-load.php not found']);
    exit;
}

require_once dirname(__FILE__) . '/../image_status.php';

function customiizer_normalize_worker_status($status)
{
    switch ($status) {
        case 'queued':
        case 'pending':
        case 'waiting':
            return 'pending';
        case 'processing':
        case 'in_progress':
        case 'running':
            return 'processing';
        case 'done':
        case 'completed':
        case 'success':
            return 'done';
        case 'failed':
        case 'error':
        case 'canceled':
            return 'error';
        default:
            return $status ?: 'processing';
    }
}

$inputJSON = file_get_contents('php://input');
if ($inputJSON === false) {
    customiizer_log($logContext, "Erreur : Impossible de lire l'entrée JSON.");
    http_response_code(500);
    echo wp_json_encode(['success' => false, 'message' => "Impossible de lire l'entrée JSON."]);
    exit;
}

$payload = json_decode($inputJSON, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($payload)) {
    customiizer_log($logContext, 'Erreur de décodage JSON: ' . json_last_error_msg());
    http_response_code(400);
    echo wp_json_encode(['success' => false, 'message' => 'JSON mal formé.']);
    exit;
}

$logSummary = sprintf(
    'Webhook reçu : jobId=%s, hash=%s, status=%s, progress=%s',
    isset($payload['jobId']) ? $payload['jobId'] : 'null',
    isset($payload['hash']) ? $payload['hash'] : 'null',
    isset($payload['status']) ? $payload['status'] : 'null',
    isset($payload['progress']) ? $payload['progress'] : 'null'
);
customiizer_log($logContext, $logSummary);

$jobId = isset($payload['jobId']) ? absint($payload['jobId']) : 0;
$hash = isset($payload['hash']) ? sanitize_text_field($payload['hash']) : '';

if (!$jobId && $hash === '') {
    customiizer_log($logContext, 'jobId ou hash manquant dans le webhook.');
    http_response_code(400);
    echo wp_json_encode(['success' => false, 'message' => 'jobId ou hash manquant.']);
    exit;
}

global $wpdb;
$jobsTable = 'WPC_generation_jobs';
$imagesTable = 'WPC_generated_image';

$job = null;

if ($jobId) {
    $job = $wpdb->get_row(
        $wpdb->prepare("SELECT id, task_id, user_id, prompt, format_image FROM {$jobsTable} WHERE id = %d", $jobId),
        ARRAY_A
    );
}

if (!$job && $hash !== '') {
    $job = $wpdb->get_row(
        $wpdb->prepare("SELECT id, task_id, user_id, prompt, format_image FROM {$jobsTable} WHERE task_id = %s", $hash),
        ARRAY_A
    );
}

if (!$job) {
    customiizer_log($logContext, sprintf('Job introuvable (jobId=%s, hash=%s)', $jobId, $hash));
    http_response_code(404);
    echo wp_json_encode(['success' => false, 'message' => 'Job introuvable.']);
    exit;
}

$now = current_time('mysql');
$status = isset($payload['status']) ? strtolower(sanitize_text_field($payload['status'])) : '';
$normalizedStatus = customiizer_normalize_worker_status($status);
$progressValue = isset($payload['progress']) ? max(0, min(100, (int) $payload['progress'])) : null;

if ($normalizedStatus !== 'done' && $progressValue === 100) {
    $normalizedStatus = 'done';
}

$message = isset($payload['message']) ? sanitize_text_field($payload['message']) : '';
$type = isset($payload['type']) ? sanitize_text_field($payload['type']) : '';
$choice = isset($payload['choice']) ? sanitize_text_field((string) $payload['choice']) : '';
$userPrompt = isset($payload['prompt']) ? sanitize_text_field($payload['prompt']) : '';

$metadata = [];
if (isset($payload['metadata']) && is_array($payload['metadata'])) {
    $metadata = $payload['metadata'];
    array_walk_recursive(
        $metadata,
        static function (&$value) {
            if (is_scalar($value)) {
                $value = sanitize_text_field((string) $value);
            }
        }
    );
}

$result = [];
if (isset($payload['result']) && is_array($payload['result'])) {
    $result = $payload['result'];
    if (isset($result['url'])) {
        $result['url'] = esc_url_raw($result['url']);
    }
    if (isset($result['thumbnail'])) {
        $result['thumbnail'] = esc_url_raw($result['thumbnail']);
    }
}

$dbStatus = 'processing';
if ($normalizedStatus === 'done') {
    $dbStatus = 'done';
} elseif ($normalizedStatus === 'error') {
    $dbStatus = 'error';
} elseif ($normalizedStatus === 'pending') {
    $dbStatus = 'pending';
}

$updateData = [
    'status' => $dbStatus,
    'updated_at' => $now,
];

$updateResult = $wpdb->update(
    $jobsTable,
    $updateData,
    ['id' => (int) $job['id']],
    ['%s', '%s'],
    ['%d']
);

customiizer_log(
    $logContext,
    sprintf(
        'Mise à jour job=%d → status=%s (progress=%s) résultat=%s',
        (int) $job['id'],
        $dbStatus,
        $progressValue !== null ? $progressValue : 'null',
        $updateResult === false ? 'erreur' : 'ok'
    )
);

$imageUrl = isset($result['url']) ? $result['url'] : '';
$insertedImage = false;

if ($imageUrl && $dbStatus === 'done') {
    $existing = $wpdb->get_var(
        $wpdb->prepare(
            "SELECT COUNT(*) FROM {$imagesTable} WHERE job_id = %d AND image_url = %s",
            (int) $job['id'],
            $imageUrl
        )
    );

    if (!$existing) {
        $nextNumber = (int) $wpdb->get_var("SELECT MAX(image_number) FROM {$imagesTable}");
        $nextNumber = $nextNumber ? $nextNumber + 1 : 1;

        $format = !empty($job['format_image']) ? sanitize_text_field($job['format_image']) : '';
        if (!$format && isset($metadata['formatImage'])) {
            $format = sanitize_text_field($metadata['formatImage']);
        }

        $imageData = [
            'image_number' => $nextNumber,
            'job_id' => (int) $job['id'],
            'user_id' => (int) $job['user_id'],
            'image_url' => $imageUrl,
            'prompt' => isset($job['prompt']) ? sanitize_text_field($job['prompt']) : '',
            'settings' => '',
            'image_date' => $now,
        ];

        $formats = ['%d', '%d', '%d', '%s', '%s', '%s', '%s'];

        if ($format) {
            $imageData['format_image'] = $format;
            $formats[] = '%s';
        }

        if ($choice !== '') {
            $imageData['image_prefix'] = 'choice_' . $choice;
            $formats[] = '%s';
        }

        $insertedImage = $wpdb->insert($imagesTable, $imageData, $formats) !== false;

        if (!$insertedImage) {
            customiizer_log($logContext, 'Erreur lors de l\'insertion de l\'image : ' . $wpdb->last_error);
        }
    }
}

if ($message === '') {
    if ($dbStatus === 'done') {
        $message = "Génération terminée !";
    } elseif ($dbStatus === 'error') {
        $message = "Une erreur est survenue pendant la génération.";
    } else {
        $progressText = $progressValue !== null ? sprintf('%d%%', $progressValue) : '';
        $message = trim("Génération en cours {$progressText}");
    }
}

$progressPayload = [
    'jobId' => (int) $job['id'],
    'status' => $dbStatus,
    'progress' => $progressValue,
    'message' => $message,
    'metadata' => array_merge(
        $metadata,
        array_filter([
            'type' => $type,
            'choice' => $choice,
            'userPrompt' => $userPrompt,
        ])
    ),
    'result' => $result,
    'updated_at' => $now,
];

$expiration = ($dbStatus === 'done' || $dbStatus === 'error') ? 30 * MINUTE_IN_SECONDS : 2 * HOUR_IN_SECONDS;
customiizer_store_job_progress($job['task_id'], $progressPayload, $expiration);

customiizer_log(
    $logContext,
    sprintf(
        'Progression enregistrée pour task=%s (expiration=%ds)',
        $job['task_id'],
        (int) $expiration
    )
);

if (($dbStatus === 'done' || $dbStatus === 'error') && function_exists('wp_schedule_single_event')) {
    // Garder les informations pendant quelques minutes pour permettre aux clients de se synchroniser
    // puis nettoyer lors d'un prochain passage
    wp_schedule_single_event(time() + $expiration, 'customiizer_clear_generation_progress', [$job['task_id']]);
}

$logDetails = [
    'job_id' => (int) $job['id'],
    'task_id' => $job['task_id'],
    'status' => $dbStatus,
    'progress' => $progressValue,
    'image_saved' => $insertedImage,
];

customiizer_log($logContext, 'Webhook traité : ' . wp_json_encode($logDetails));

echo wp_json_encode([
    'success' => true,
    'data' => array_merge(
        $logDetails,
        [
            'message' => $message,
            'imageUrl' => $imageUrl,
        ]
    ),
]);
exit;
