<?php
/**
 * General REST API permission callback.
 * Allows access when a valid API key is provided
 * or when the user is authenticated.
 * Printful webhooks identified by the X-Printful-Signature
 * header are also allowed and validated separately in the
 * webhook handler.
 */
function customiizer_api_permission(WP_REST_Request $request) {
    // Allow Printful webhooks which include a signature header
    if ($request->get_header('X-Printful-Signature')) {
        return true;
    }

    // Check API key via header or query param
    $api_key = $request->get_header('X-Customiizer-Key');
    if (!$api_key) {
        $api_key = $request->get_param('api_key');
    }
    if (defined('CUSTOMIIZER_API_KEY') && $api_key === CUSTOMIIZER_API_KEY) {
        return true;
    }

    // Fallback to logged in user
    return is_user_logged_in();
}
