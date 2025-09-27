<?php

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

require_once dirname(__DIR__, 5) . '/wp-load.php';
require_once dirname(__DIR__, 2) . '/vendor/autoload.php';
require_once dirname(__DIR__, 2) . '/utilities.php';

header('Content-Type: application/json; charset=utf-8');

$logContext = 'generate_image';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    customiizer_log($logContext, 'Requête rejetée : méthode invalide ' . ($_SERVER['REQUEST_METHOD'] ?? 'unknown'));
    http_response_code(405);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Méthode non autorisée.'
    ]);
    exit;
}

$rawInput = file_get_contents('php://input');
customiizer_log($logContext, 'Payload brut reçu : ' . substr($rawInput ?: '', 0, 1000));

$payload = json_decode($rawInput, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    customiizer_log($logContext, 'JSON invalide : ' . json_last_error_msg());
    http_response_code(400);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Requête JSON invalide.'
    ]);
    exit;
}

if (!is_user_logged_in()) {
    customiizer_log($logContext, 'Utilisateur non authentifié pour la génération d\'image.');
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
    customiizer_log($logContext, 'Prompt manquant.');
    http_response_code(400);
    echo wp_json_encode([
        'success' => false,
        'message' => 'Le prompt est obligatoire.'
    ]);
    exit;
}

if ($formatImage === '') {
    customiizer_log($logContext, 'Format image manquant.');
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
$promptPreview = function_exists('mb_substr') ? mb_substr($prompt, 0, 200) : substr($prompt, 0, 200);

customiizer_log(
    $logContext,
    sprintf(
        'Initialisation génération : user=%d, task=%s, format=%s, prompt="%s"',
        $userId,
        $taskId,
        $formatImage,
        $promptPreview
    )
);

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

$queueName = defined('RABBIT_IMAGE_QUEUE') ? RABBIT_IMAGE_QUEUE : 'image_jobs_dev';

customiizer_log(
    $logContext,
    sprintf(
        'Job #%d enregistré, tentative d\'envoi RabbitMQ sur %s:%s (queue=%s)',
        $jobId,
        defined('RABBIT_HOST') ? RABBIT_HOST : 'undefined',
        defined('RABBIT_PORT') ? RABBIT_PORT : 'undefined',
        $queueName
    )
);

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
    customiizer_log(
        $logContext,
        sprintf('Message publié dans RabbitMQ pour job=%d task=%s', $jobId, $taskId)
    );
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

customiizer_log(
    $logContext,
    sprintf('Job %s (%d) créé et message RabbitMQ envoyé pour utilisateur %d', $taskId, $jobId, $userId)
);

echo wp_json_encode([
    'success' => true,
    'taskId' => $taskId,
    'jobId' => $jobId,
    'status' => 'pending'
]);
exit;
