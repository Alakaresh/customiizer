<?php
require_once __DIR__ . '/../utilities.php';
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
            $delay = round(PRINTFUL_DELAY_SEC - $sinceLast, 3);
            customiizer_log("\xE2\x8C\x9B Waiting {$delay}s before next Printful request");
            usleep((int)((PRINTFUL_DELAY_SEC - $sinceLast) * 1e6));
            $now = microtime(true);
        }
    }

    if (count($timestamps) >= PRINTFUL_MAX_PER_MINUTE) {
        $oldest = reset($timestamps);
        $sleep = 60 - ($now - $oldest) + 0.001;
        if ($sleep > 0) {
            customiizer_log("\xE2\x8F\xB3 Rate limit hit, sleeping {$sleep}s");
            usleep((int)($sleep * 1e6));
        }
        $now = microtime(true);
        $timestamps = array_values(array_filter($timestamps, function($t) use ($now) {
            return ($now - $t) < 60;
        }));
    }

    try {
        $start = microtime(true);
        customiizer_log('\xE2\x9E\xA1\xEF\xB8\x8F Calling Printful API');
        $result = $callback();
        $elapsed = round(microtime(true) - $start, 3);
        customiizer_log("\xE2\xAC\x85\xEF\xB8\x8F Printful API finished in {$elapsed}s");
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

/**
 * Execute a cURL request while respecting Printful rate limits.
 * If the first call returns HTTP 429, the function waits for the
 * duration indicated by the Retry-After header or error message
 * then retries once.
 *
 * @param resource $ch Initialized cURL handle
 * @return array [$body, $httpCode]
 */
function printful_curl_exec($ch): array {
    $perform = function() use ($ch, &$body, &$code, &$headers) {
        $headers = [];
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($curl, $header) use (&$headers) {
            $len = strlen($header);
            $parts = explode(':', $header, 2);
            if (count($parts) == 2) {
                $headers[strtolower(trim($parts[0]))] = trim($parts[1]);
            }
            return $len;
        });
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        printful_request(function () use ($ch, &$body, &$code) {
            $body = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        });
    };

    $perform();

    if ($code === 429) {
        $wait = 0;
        if (isset($headers['retry-after'])) {
            $wait = (int) ceil($headers['retry-after']);
        } elseif (preg_match('/(\d+(?:\.\d+)?)\s*sec/i', $body, $m)) {
            $wait = (int) ceil($m[1]);
        }
        if ($wait < 1) {
            $wait = 1;
        }
        customiizer_log("\xE2\x8F\xB3 HTTP 429, sleeping {$wait}s before retry");
        sleep($wait);
        customiizer_log("\x21A9\xFE0F Retrying Printful request");
        $perform();
    }

    if (isset($headers['x-ratelimit-remaining']) || isset($headers['x-ratelimit-reset'])) {
        $remaining = $headers['x-ratelimit-remaining'] ?? '?';
        $reset     = $headers['x-ratelimit-reset'] ?? '?';
        customiizer_log("\xF0\x9F\xAA\xA3 Reste {$remaining} requ\xC3\xAAtes, r\xC3\xA9initialisation dans {$reset}s");
    }

    return [$body, $code];
}
