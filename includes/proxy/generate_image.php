<?php

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

require_once dirname(__DIR__, 5) . '/wp-load.php';
require_once dirname(__DIR__, 2) . '/vendor/autoload.php';
require_once dirname(__DIR__, 2) . '/utilities.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    customiizer_log('generate_image', 'Requête rejetée : méthode non autorisée (' . $_SERVER['REQUEST_METHOD'] . ')');
    http_response_code(405);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée.'
    ]);
    exit;
}

$rawInput = file_get_contents('php://input');
if ($rawInput === false) {
    $rawInput = '';
}
customiizer_log('generate_image', 'Requête brute reçue : ' . substr($rawInput, 0, 500));

$payload = json_decode($rawInput, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    customiizer_log('generate_image', 'Requête JSON invalide : ' . json_last_error_msg());
    http_response_code(400);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Requête JSON invalide.'
    ]);
    exit;
}

if (!is_user_logged_in()) {
    customiizer_log('generate_image', 'Requête refusée : utilisateur non authentifié');
    http_response_code(401);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Authentification requise.'
    ]);
    exit;
}

$prompt = isset($payload['prompt']) ? trim(wp_unslash($payload['prompt'])) : '';
$formatImage = isset($payload['format_image']) ? sanitize_text_field($payload['format_image']) : '';

if ($prompt === '') {
    customiizer_log('generate_image', 'Requête invalide : prompt manquant');
    http_response_code(400);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Le prompt est obligatoire.'
    ]);
    exit;
}

if ($formatImage === '') {
    customiizer_log('generate_image', "Requête invalide : format d'image manquant");
    http_response_code(400);
    echo wp_json_encode([
        'success' => false,
        'message' => "Le format de l'image est obligatoire."
    ]);
    exit;
}

$userId = get_current_user_id();
$taskId = uniqid('task_', true);
$now = current_time('mysql');

$promptLength = strlen($prompt);
$promptPreview = function_exists('mb_substr') ? mb_substr($prompt, 0, 120, 'UTF-8') : substr($prompt, 0, 120);
if ($promptLength > 120) {
    $promptPreview .= '…';
}

$logContextData = [
    'userId' => $userId,
    'taskId' => $taskId,
    'promptLength' => $promptLength,
    'promptPreview' => $promptPreview,
    'formatImage' => $formatImage,
];

customiizer_log('generate_image', 'Requête validée : ' . wp_json_encode($logContextData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

global $wpdb;
$customPrefix = 'WPC_';
$jobsTable = $customPrefix . 'generation_jobs';

$inserted = $wpdb->insert(
    $jobsTable,
    [
        'task_id' => $taskId,
        'user_id' => $userId,
        'prompt' => $prompt,
        'format_image' => $formatImage,
        'status' => 'pending',
        'created_at' => $now,
        'updated_at' => $now,
    ],
    ['%s', '%d', '%s', '%s', '%s', '%s', '%s']
);

if ($inserted === false) {
    customiizer_log('generate_image', 'Échec insertion job : ' . $wpdb->last_error);
    http_response_code(500);
    echo wp_json_encode([
        'success' => false,
        'message' => "Impossible d'enregistrer la génération."
    ]);
    exit;
}

$jobId = (int) $wpdb->insert_id;
customiizer_log('generate_image', sprintf('Job inséré (ID %d) pour la tâche %s', $jobId, $taskId));

$queueName = defined('RABBIT_IMAGE_QUEUE') ? RABBIT_IMAGE_QUEUE : 'image_jobs_dev';

try {
    $connection = new AMQPStreamConnection(
        RABBIT_HOST,
        RABBIT_PORT,
        RABBIT_USER,
        RABBIT_PASS
    );

    $channel = $connection->channel();
    $channel->queue_declare($queueName, false, true, false, false);

    $messageBody = wp_json_encode([
        'taskId' => $taskId,
        'jobId' => $jobId,
        'userId' => $userId,
        'prompt' => $prompt,
        'formatImage' => $formatImage,
        'format_image' => $formatImage,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $message = new AMQPMessage(
        $messageBody,
        ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT]
    );

    $channel->basic_publish($message, '', $queueName);
    $channel->close();
    $connection->close();
    customiizer_log('generate_image', sprintf('Message RabbitMQ publié sur %s pour job %d', $queueName, $jobId));
} catch (Throwable $exception) {
    customiizer_log('generate_image', 'Erreur RabbitMQ : ' . $exception->getMessage());
    $wpdb->update(
        $jobsTable,
        [
            'status' => 'error',
            'updated_at' => current_time('mysql'),
        ],
        ['id' => $jobId],
        ['%s', '%s'],
        ['%d']
    );

    http_response_code(500);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Impossible de programmer la génération pour le moment.'
    ]);
    exit;
}

customiizer_log('generate_image', sprintf('Job %s (%d) créé pour utilisateur %d', $taskId, $jobId, $userId));

echo wp_json_encode([
    'success' => true,
    'taskId' => $taskId,
    'status' => 'pending'
]);
exit;
