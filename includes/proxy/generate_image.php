<?php

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

require_once dirname(__DIR__, 5) . '/wp-load.php';
require_once dirname(__DIR__, 2) . '/vendor/autoload.php';
require_once dirname(__DIR__, 2) . '/utilities.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée.'
    ]);
    exit;
}

$payload = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Requête JSON invalide.'
    ]);
    exit;
}

if (!is_user_logged_in()) {
    http_response_code(401);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Authentification requise.'
    ]);
    exit;
}

$prompt = isset($payload['prompt']) ? trim(wp_unslash($payload['prompt'])) : '';
$rawSettings = $payload['settings'] ?? [];

if ($prompt === '') {
    http_response_code(400);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Le prompt est obligatoire.'
    ]);
    exit;
}

$settingsText = is_array($rawSettings) ? wp_json_encode($rawSettings) : (string) $rawSettings;
$userId = get_current_user_id();
$taskId = uniqid('task_', true);
$now = current_time('mysql');

global $wpdb;
$jobsTable = $wpdb->prefix . 'generation_jobs';

$inserted = $wpdb->insert(
    $jobsTable,
    [
        'task_id' => $taskId,
        'user_id' => $userId,
        'prompt' => $prompt,
        'settings' => $settingsText,
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
        'settings' => $settingsText,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $message = new AMQPMessage(
        $messageBody,
        ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT]
    );

    $channel->basic_publish($message, '', $queueName);
    $channel->close();
    $connection->close();
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
