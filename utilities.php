<?php
function customiizer_log($message) {
	$log_file = __DIR__ . '/customiizer.log';
	$date = date('Y-m-d H:i:s');
	$line = "[$date] $message\n";
	file_put_contents($log_file, $line, FILE_APPEND);
}
