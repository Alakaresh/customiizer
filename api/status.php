<?php
register_rest_route('api/v1/monitoring', '/status', [
	'methods' => 'GET',
	'callback' => 'api_get_system_status',
	'permission_callback' => '__return_true'
]);
function api_get_system_status() {
	$status = [];

	// Service send-order
	$service_status = trim(shell_exec("systemctl is-active send-order.service"));
	$status['send_order'] = $service_status === "active" ? "🟢 Actif" : "🔴 $service_status";

	// Ping RabbitMQ
	$socket = @fsockopen(RABBIT_HOST, RABBIT_PORT, $errno, $errstr, 2);
	$status['rabbitmq'] = $socket ? "🟢 Connecté" : "🔴 $errstr";
	if ($socket) fclose($socket);

	// Log activité
	$log_file = 'https://customiizer.com/var/log/send_order.log';
	if (file_exists($log_file)) {
		$last_line = trim(shell_exec("tail -n 1 $log_file"));
		$status['last_activity'] = $last_line ?: "⛔ Vide";
	} else {
		$status['last_activity'] = "❌ Aucun log trouvé";
	}

	return rest_ensure_response($status);
}
