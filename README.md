# Customiizer Theme

This WordPress theme powers the Customiizer site. Some features rely on PHP's GD extension for generating PNG images.

## PNG compression

Only mockup images converted from WebP to PNG use the `PNG_COMPRESSION_LEVEL` constant defined in `utilities.php`. This constant is read by the `convert_webp_to_png_server()` function in `includes/generate_mockup.php`. The value ranges from `0` (no compression) to `9` (maximum compression). Higher compression reduces file size but increases CPU usage when saving images.

Adjust `PNG_COMPRESSION_LEVEL` if you need smaller mockup files or faster image generation.

The default value is set to `5` for a balance between compression and speed.

`MOCKUP_MAX_DIMENSION` controls the maximum width or height of PNG mockup images.  
Images larger than this value are downscaled before saving. The default is `1500` pixels.

## Position editor

Enable the checkbox "Activer l'éditeur de position" in the **Custom Produits** admin page to adjust the mockup position on product pages. When enabled, `js/product/position_editor.js` is enqueued automatically.

The editor shows two range sliders controlling the top and left position (in pixels). Values range from -200 to 200 and move in 0.1% increments. Each slider now includes a number field so you can type the percentage manually for precise adjustments. After tweaking the values, press **Save** to send them to `/variant/<id>/mockup-position` with the selected `mockup_id`.

## API keys

Several features rely on external services. Define the following constants in your `wp-config.php` file:

```php
define('PRINTFUL_API_KEY',    'your-printful-key');
define('MIDJOURNEY_API_KEY',  'your-midjourney-key');
define('DIRECTUS_API_TOKEN',  'your-directus-token');

// Optionally override the API URLs
define('MIDJOURNEY_API_URL', 'https://api.userapi.ai/midjourney/v2/imagine');
define('DIRECTUS_API_URL',   'http://customiizer.info:8055');
```

These constants allow the theme to contact Printful for mockups, Midjourney for AI images and the Directus backend for image status.
If `MIDJOURNEY_API_KEY` is missing, the proxy endpoints return a 400 JSON error.
