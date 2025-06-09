<?php

class PrintfulWebhookLogger
{
    private $log_file;

    public function __construct($log_file_path)
    {
        $this->log_file = $log_file_path;
    }

    public function log($message)
    {
        $timestamp = date('c');
        file_put_contents($this->log_file, "{$timestamp} - {$message}\n", FILE_APPEND);
    }
}
