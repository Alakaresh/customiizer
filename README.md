# Customiizer Theme

This WordPress theme powers the Customiizer site. Some features rely on PHP's GD extension for generating PNG images.

## PNG compression

Only mockup images converted from WebP to PNG use the `PNG_COMPRESSION_LEVEL` constant defined in `utilities.php`. This constant is read by the `convert_webp_to_png_server()` function in `includes/generate_mockup.php`. The value ranges from `0` (no compression) to `9` (maximum compression). Higher compression reduces file size but increases CPU usage when saving images.

Adjust `PNG_COMPRESSION_LEVEL` if you need smaller mockup files or faster image generation.

The default value is set to `6`, trading some compression for noticeably faster file saves.

`MOCKUP_MAX_DIMENSION` controls the maximum width or height of PNG mockup images.
Images larger than this value are downscaled before saving. The default is `1500` pixels.

## Printful API

Define the credentials below in `wp-config.php` or your server environment so the theme can contact Printful:

```
define('PRINTFUL_API_KEY', 'your-secret-key');
define('PRINTFUL_STORE_ID', 'your-store-id');
define('PRINTFUL_API_BASE', 'https://api.printful.com/v2'); // optional
```

`PRINTFUL_API_BASE` is optional and defaults to the public Printful URL. `PRINTFUL_API_KEY` is required by `includes/generate_mockup.php` and webhook handlers.

The helper `includes/printful_rate_limit.php` defines `printful_request()`
to handle Printful's quota limits. Existing scripts should wrap their API
requests in this function instead of calling `printful_rate_limit()`
directly:

```php
printful_request(function () {
    // your cURL request here
});
```

`printful_request` keeps its lock for the entire duration of the HTTP
request. This guarantees at least `PRINTFUL_DELAY_SEC` between calls and
no more than `PRINTFUL_MAX_PER_MINUTE` during any 60&nbsp;s window. The
timestamp list is stored in a temporary file so limits apply across all
PHP processes. Override the defaults by defining `PRINTFUL_DELAY_SEC` and
`PRINTFUL_MAX_PER_MINUTE` in `wp-config.php`.

If the API responds with **HTTP&nbsp;429**, `printful_request` now waits
for the duration specified by the `Retry-After` header (or the message
body) and retries the call once automatically. The wait and retry are
logged to `customiizer.log` for visibility.

Design images are converted from WebP to PNG during mockup generation. The order
webhook only performs this conversion if a legacy WebP URL is still stored.

## Position editor

Enable the checkbox "Activer l'éditeur de position" in the **Custom Produits** admin page to adjust the mockup position on product pages. When enabled, `js/product/position_editor.js` is enqueued automatically.

The editor shows two range sliders controlling the top and left position (in %). Values range from -200 to 200. Each slider also has a numeric field for manual entry so you can input precise percentages. These numeric fields are now wider (80&nbsp;px) for easier editing. When enabled, the sliders allow changes down to a tenth of a percent for fine tuning. The slider values now update to match whichever mockup thumbnail is selected, letting you edit positions individually. After tweaking the values, press **Save** to send them to `/variant/<id>/mockup-position` with the selected `mockup_id`.

The panel also displays the current `product_id`, `variant_id` and `mockup_id` so you can verify which item you are editing.


The floating panel uses a grayscale theme so it stays visually distinct from the product page. The **Save** button now appears in black for higher contrast.

## Mobile block

A new **Blocage Mobile** section is available in the Dashboard. Use the checkbox to disable access from smartphones. When enabled, visitors on a phone see a placeholder message defined in `header.php`.
