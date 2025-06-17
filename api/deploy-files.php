<?php
/**
 * Script pour générer deploy-files.json avec hash MD5
 */

register_rest_route('api/v1', '/deploy-files', [
	'methods' => 'GET',
	'callback' => function () {
		return customiizer_list_files_with_hash();
	},
	'permission_callback' => '__return_true'
]);

function customiizer_list_files_with_hash($dir = '', $base = null) {
	$base = $base ?: get_stylesheet_directory();
	$full_path = $base . $dir;
	$result = [];

	foreach (scandir($full_path) as $file) {
		if ($file === '.' || $file === '..') continue;
		$relative_path = ltrim($dir . '/' . $file, '/');
		$absolute_path = $full_path . '/' . $file;

		if (is_dir($absolute_path)) {
			$result = array_merge($result, customiizer_list_files_with_hash($dir . '/' . $file, $base));
		} else {
			$result[] = [
				'path' => $relative_path,
				'hash' => md5_file($absolute_path)
			];
		}
	}
	return $result;
}
