<?php
/**
 * API Ping – Vérifie que l'API fonctionne et retourne la version du back
 */

register_rest_route('api/v1', '/ping', [
	'methods' => 'GET',
	'callback' => 'customiizer_api_ping',
	'permission_callback' => 'customiizer_api_permissions'
]);

function customiizer_api_ping() {
	$version_file = get_stylesheet_directory() . '/version.json';
	$version_data = file_exists($version_file) ? json_decode(file_get_contents($version_file), true) : [];

	return [
		'success' => true,
		'message' => 'API OK',
		'env'     => $version_data['env'] ?? 'unknown',
		'api_version' => $version_data['api'] ?? 'not defined',
		'frontend' => $version_data['frontend'] ?? 'not defined'
	];
}
