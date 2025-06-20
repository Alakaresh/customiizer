<?php
if (!defined('PRINTFUL_DELAY_SEC')) {
    define('PRINTFUL_DELAY_SEC', 1);
}

function printful_request(callable $callback) {
    static $filePath = null;
    if ($filePath === null) {
        $filePath = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
            . DIRECTORY_SEPARATOR . 'printful_rate_limit.json';
    }

    $now = microtime(true);

    $fp = fopen($filePath, 'c+');
    if ($fp === false) {
        $timestamps = [];
    } else {
        flock($fp, LOCK_EX);

        $contents = stream_get_contents($fp);
        $timestamps = json_decode($contents, true);
        if (!is_array($timestamps)) {
            $timestamps = [];
        }
    }

    $timestamps = array_values(array_filter($timestamps, function($t) use ($now) {
        return ($now - $t) < 60;
    }));

    if (!empty($timestamps)) {
        $last = end($timestamps);
        $sinceLast = $now - $last;
        if ($sinceLast < PRINTFUL_DELAY_SEC) {
            usleep((int)((PRINTFUL_DELAY_SEC - $sinceLast) * 1e6));
            $now = microtime(true);
        }
    }

    if (count($timestamps) >= PRINTFUL_MAX_PER_MINUTE) {
        $oldest = reset($timestamps);
        $sleep = 60 - ($now - $oldest) + 0.001;
        if ($sleep > 0) {
            usleep((int)($sleep * 1e6));
        }
        $now = microtime(true);
        $timestamps = array_values(array_filter($timestamps, function($t) use ($now) {
            return ($now - $t) < 60;
        }));
    }

    try {
        $result = $callback();
    } finally {
        $timestamps[] = microtime(true);

        if ($fp !== false) {
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($timestamps));
            fflush($fp);
            flock($fp, LOCK_UN);
            fclose($fp);
        }
    }

    return $result;
}
if (!defined('PRINTFUL_MAX_PER_MINUTE')) {
    define('PRINTFUL_MAX_PER_MINUTE', 55);
}

function printful_rate_limit(): void {
    static $filePath = null;
    if ($filePath === null) {
        $filePath = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
            . DIRECTORY_SEPARATOR . 'printful_rate_limit.json';
    }

    $now = microtime(true);

    $fp = fopen($filePath, 'c+');
    if ($fp === false) {
        // If the file cannot be opened, fall back to in-memory timestamps
        $timestamps = [];
    } else {
        // Acquire exclusive lock to avoid race conditions
        flock($fp, LOCK_EX);

        $contents = stream_get_contents($fp);
        $timestamps = json_decode($contents, true);
        if (!is_array($timestamps)) {
            $timestamps = [];
        }
    }

    // Remove calls older than 60 seconds
    $timestamps = array_values(array_filter($timestamps, function($t) use ($now) {
        return ($now - $t) < 60;
    }));

    // Ensure at least PRINTFUL_DELAY_SEC between calls
    if (!empty($timestamps)) {
        $last = end($timestamps);
        $sinceLast = $now - $last;
        if ($sinceLast < PRINTFUL_DELAY_SEC) {
            usleep((int)((PRINTFUL_DELAY_SEC - $sinceLast) * 1e6));
            $now = microtime(true);
        }
    }

    // Enforce PRINTFUL_MAX_PER_MINUTE over rolling window
    if (count($timestamps) >= PRINTFUL_MAX_PER_MINUTE) {
        $oldest = reset($timestamps);
        $sleep = 60 - ($now - $oldest) + 0.001;
        if ($sleep > 0) {
            usleep((int)($sleep * 1e6));
        }
        $now = microtime(true);
        $timestamps = array_values(array_filter($timestamps, function($t) use ($now) {
            return ($now - $t) < 60;
        }));
    }

    $timestamps[] = $now;

    if ($fp !== false) {
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($timestamps));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}
