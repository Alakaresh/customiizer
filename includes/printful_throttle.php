<?php
if (!defined('ABSPATH')) {
    exit;
}

// Token bucket capacity and refill rate
const PRINTFUL_BUCKET_SIZE = 120;
const PRINTFUL_BUCKET_REFILL_RATE = 120 / 60; // 2 tokens per second

/**
 * Retrieve bucket state from options.
 */
function printful_get_bucket() {
    $bucket = get_option('printful_throttle_bucket');
    if (!is_array($bucket) || !isset($bucket['tokens'], $bucket['updated'])) {
        $bucket = ['tokens' => PRINTFUL_BUCKET_SIZE, 'updated' => microtime(true)];
    }
    return $bucket;
}

/**
 * Persist bucket state.
 */
function printful_save_bucket(array $bucket) {
    update_option('printful_throttle_bucket', $bucket, false);
}

/**
 * Wait until a token is available or fail when exceeding $max_wait seconds.
 */
function printful_throttle(int $tokens = 1, int $max_wait = 60): bool {
    $start = microtime(true);

    while (true) {
        $bucket = printful_get_bucket();
        $now = microtime(true);
        $elapsed = $now - $bucket['updated'];
        $bucket['tokens'] = min(PRINTFUL_BUCKET_SIZE, $bucket['tokens'] + $elapsed * PRINTFUL_BUCKET_REFILL_RATE);
        $bucket['updated'] = $now;

        if ($bucket['tokens'] >= $tokens) {
            $bucket['tokens'] -= $tokens;
            printful_save_bucket($bucket);
            return true;
        }

        $needed = $tokens - $bucket['tokens'];
        $wait = $needed / PRINTFUL_BUCKET_REFILL_RATE;

        if (($now - $start + $wait) > $max_wait) {
            // Save current state before failing
            printful_save_bucket($bucket);
            return false;
        }

        printful_save_bucket($bucket);
        usleep((int)($wait * 1e6));
    }
}

/**
 * Adjust bucket from remaining tokens header.
 */
function printful_adjust_tokens($remaining): void {
    if ($remaining === null) return;
    $bucket = printful_get_bucket();
    $bucket['tokens'] = max(0, min(PRINTFUL_BUCKET_SIZE, (float)$remaining));
    $bucket['updated'] = microtime(true);
    printful_save_bucket($bucket);
}

/**
 * Wrapper around wp_remote_get that applies throttling.
 */
function printful_wp_get(string $url, array $args = []) {
    if (!printful_throttle()) {
        return new WP_Error('printful_throttle', 'Rate limit exceeded');
    }
    $response = wp_remote_get($url, $args);
    $headers = wp_remote_retrieve_headers($response);
    if (isset($headers['x-ratelimit-remaining'])) {
        printful_adjust_tokens((int)$headers['x-ratelimit-remaining']);
    }
    return $response;
}

/**
 * Wrapper around wp_remote_post that applies throttling.
 */
function printful_wp_post(string $url, array $args = []) {
    if (!printful_throttle()) {
        return new WP_Error('printful_throttle', 'Rate limit exceeded');
    }
    $response = wp_remote_post($url, $args);
    $headers = wp_remote_retrieve_headers($response);
    if (isset($headers['x-ratelimit-remaining'])) {
        printful_adjust_tokens((int)$headers['x-ratelimit-remaining']);
    }
    return $response;
}
