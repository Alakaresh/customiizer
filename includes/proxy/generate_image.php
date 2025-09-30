<?php

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

require_once dirname(__DIR__, 5) . '/wp-load.php';
require_once dirname(__DIR__, 2) . '/vendor/autoload.php';
require_once dirname(__DIR__, 2) . '/utilities.php';
require_once dirname(__DIR__) . '/image_generation.php';

header('Content-Type: application/json; charset=utf-8');

customiizer_proxy_require_post_request();

$payload = customiizer_proxy_parse_json_body();
$userId  = customiizer_proxy_require_authentication();
[$prompt, $formatImage] = customiizer_proxy_validate_payload($payload);

[$jobId, $taskId] = customiizer_proxy_create_job($userId, $prompt, $formatImage);

$messagePayload = [
    'taskId'      => $taskId,
    'jobId'       => $jobId,
    'userId'      => $userId,
    'prompt'      => $prompt,
    'formatImage' => $formatImage,
    'format_image'=> $formatImage,
];

$queueName = defined('RABBIT_IMAGE_QUEUE') ? RABBIT_IMAGE_QUEUE : 'image_jobs_dev';
$publishResult = customiizer_proxy_publish_job($messagePayload, $queueName);

if (is_wp_error($publishResult)) {
    customiizer_log('generate_image', 'Erreur RabbitMQ : ' . $publishResult->get_error_message());
    customiizer_proxy_mark_job_as_error($jobId);

    wp_send_json_error(
        ['message' => 'Impossible de programmer la génération pour le moment.'],
        500
    );
}

customiizer_log('generate_image', sprintf('Job %s (%d) créé pour utilisateur %d', $taskId, $jobId, $userId));

wp_send_json_success([
    'taskId' => $taskId,
    'status' => 'pending',
]);
exit;

function customiizer_proxy_require_post_request() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        customiizer_log('generate_image', 'Requête rejetée : méthode non autorisée (' . $_SERVER['REQUEST_METHOD'] . ')');
        wp_send_json_error(
            ['message' => 'Méthode non autorisée.'],
            405
        );
    }
}

function customiizer_proxy_parse_json_body() {
    $rawInput = file_get_contents('php://input');
    if ($rawInput === false) {
        $rawInput = '';
    }

    customiizer_log('generate_image', 'Requête brute reçue : ' . substr($rawInput, 0, 500));

    $payload = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($payload)) {
        customiizer_log('generate_image', 'Requête JSON invalide : ' . json_last_error_msg());
        wp_send_json_error(
            ['message' => 'Requête JSON invalide.'],
            400
        );
    }

    return $payload;
}

function customiizer_proxy_require_authentication() {
    if (!is_user_logged_in()) {
        customiizer_log('generate_image', 'Requête refusée : utilisateur non authentifié');
        wp_send_json_error(
            ['message' => 'Authentification requise.'],
            401
        );
    }

    return get_current_user_id();
}

function customiizer_proxy_validate_payload(array $payload) {
    $rawPrompt = isset($payload['prompt']) ? $payload['prompt'] : '';
    $rawPrompt = is_string($rawPrompt) ? trim(wp_unslash($rawPrompt)) : '';

    $rawFormat = isset($payload['format_image']) ? $payload['format_image'] : '';
    $rawFormat = is_string($rawFormat) ? wp_unslash($rawFormat) : '';

    if ($rawPrompt === '') {
        customiizer_log('generate_image', 'Requête invalide : prompt manquant');
        wp_send_json_error(
            ['message' => 'Le prompt est obligatoire.'],
            400
        );
    }

    if ($rawFormat === '') {
        customiizer_log('generate_image', "Requête invalide : format d'image manquant");
        wp_send_json_error(
            ['message' => "Le format de l'image est obligatoire."],
            400
        );
    }

    $prompt      = sanitize_textarea_field($rawPrompt);
    $formatImage = sanitize_text_field($rawFormat);

    return [$prompt, $formatImage];
}

function customiizer_proxy_create_job($userId, $prompt, $formatImage) {
    global $wpdb;

    $tables   = customiizer_get_generation_tables();
    $jobsTable = $tables['jobs'];

    $taskId = uniqid('task_', true);
    $now    = current_time('mysql');

    $logContext = customiizer_proxy_build_log_context($userId, $taskId, $prompt, $formatImage);
    customiizer_log('generate_image', 'Requête validée : ' . wp_json_encode($logContext, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

    $inserted = $wpdb->insert(
        $jobsTable,
        [
            'task_id'      => $taskId,
            'user_id'      => $userId,
            'prompt'       => $prompt,
            'format_image' => $formatImage,
            'status'       => 'pending',
            'created_at'   => $now,
            'updated_at'   => $now,
        ],
        ['%s', '%d', '%s', '%s', '%s', '%s', '%s']
    );

    if ($inserted === false) {
        customiizer_log('generate_image', 'Échec insertion job : ' . $wpdb->last_error);
        wp_send_json_error(
            ['message' => "Impossible d'enregistrer la génération."],
            500
        );
    }

    $jobId = (int) $wpdb->insert_id;
    customiizer_log('generate_image', sprintf('Job inséré (ID %d) pour la tâche %s', $jobId, $taskId));

    return [$jobId, $taskId];
}

function customiizer_proxy_build_log_context($userId, $taskId, $prompt, $formatImage) {
    $promptLength = function_exists('mb_strlen') ? mb_strlen($prompt, 'UTF-8') : strlen($prompt);
    $promptPreview = function_exists('mb_substr') ? mb_substr($prompt, 0, 120, 'UTF-8') : substr($prompt, 0, 120);

    if ($promptLength > 120) {
        $promptPreview .= '…';
    }

    return [
        'userId'       => $userId,
        'taskId'       => $taskId,
        'promptLength' => $promptLength,
        'promptPreview'=> $promptPreview,
        'formatImage'  => $formatImage,
    ];
}

function customiizer_proxy_publish_job(array $messagePayload, $queueName) {
    $connection = null;
    $channel    = null;

    try {
        $connection = new AMQPStreamConnection(
            RABBIT_HOST,
            RABBIT_PORT,
            RABBIT_USER,
            RABBIT_PASS
        );

        $channel = $connection->channel();
        $channel->queue_declare($queueName, false, true, false, false);

        $messageBody = wp_json_encode($messagePayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $message     = new AMQPMessage(
            $messageBody,
            ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT]
        );

        $channel->basic_publish($message, '', $queueName);
        $channel->close();
        $connection->close();

        customiizer_log('generate_image', sprintf('Message RabbitMQ publié sur %s pour job %d', $queueName, $messagePayload['jobId']));

        return true;
    } catch (Throwable $exception) {
        if ($channel && method_exists($channel, 'close')) {
            try {
                $channel->close();
            } catch (Throwable $closeException) {
                // Ignored on purpose.
            }
        }

        if ($connection && method_exists($connection, 'close')) {
            try {
                $connection->close();
            } catch (Throwable $closeException) {
                // Ignored on purpose.
            }
        }

        return new WP_Error('rabbitmq_error', $exception->getMessage());
    }
}

function customiizer_proxy_mark_job_as_error($jobId) {
    global $wpdb;

    $tables    = customiizer_get_generation_tables();
    $jobsTable = $tables['jobs'];

    $wpdb->update(
        $jobsTable,
        [
            'status'     => 'error',
            'updated_at' => current_time('mysql'),
        ],
        ['id' => (int) $jobId],
        ['%s', '%s'],
        ['%d']
    );
}
