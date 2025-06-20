<?php
if (!defined('PRINTFUL_DELAY_SEC')) {
    define('PRINTFUL_DELAY_SEC', 1);
}
if (!defined('PRINTFUL_MAX_PER_MINUTE')) {
    define('PRINTFUL_MAX_PER_MINUTE', 55);
}

function printful_rate_limit(): void {
    static $timestamps = [];
    $now = microtime(true);

    // Remove calls older than 60 seconds
    $timestamps = array_filter($timestamps, function($t) use ($now) {
        return ($now - $t) < 60;
    });

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
        $timestamps = array_filter($timestamps, function($t) use ($now) {
            return ($now - $t) < 60;
        });
    }

    $timestamps[] = $now;
}
