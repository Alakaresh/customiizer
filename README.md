# Customiizer Theme

This WordPress theme powers the Customiizer site. Some features rely on PHP's GD extension for generating PNG images.

## PNG compression

Only mockup images converted from WebP to PNG use the `PNG_COMPRESSION_LEVEL` constant defined in `utilities.php`. This constant is read by the `convert_webp_to_png_server()` function in `includes/generate_mockup.php`. The value ranges from `0` (no compression) to `9` (maximum compression). Higher compression reduces file size but increases CPU usage when saving images.

Adjust `PNG_COMPRESSION_LEVEL` if you need smaller mockup files or faster image generation.

The default value is set to `8` for near-maximum compression.

`MOCKUP_MAX_DIMENSION` controls the maximum width or height of PNG mockup images.
Images larger than this value are downscaled before saving. The default is `1500` pixels.

`ALLOWED_IMAGE_HOSTS`, `REMOTE_IMAGE_TIMEOUT` and `REMOTE_IMAGE_MAX_BYTES` also live in
`utilities.php`. These constants secure remote WebP downloads performed by
`convert_webp_to_png_server()` by restricting which hosts are allowed and by
limiting request size and timeout.

## Position editor

Enable the checkbox "Activer l'éditeur de position" in the **Custom Produits** admin page to adjust the mockup position on product pages. When enabled, `js/product/position_editor.js` is enqueued automatically.

The editor shows two range sliders controlling the top and left position (in %). Values range from -200 to 200. Each slider also has a numeric field for manual entry so you can input precise percentages. These numeric fields are now wider (80&nbsp;px) for easier editing. When enabled, the sliders allow changes down to a tenth of a percent for fine tuning. The slider values now update to match whichever mockup thumbnail is selected, letting you edit positions individually. After tweaking the values, press **Save** to send them to `/variant/<id>/mockup-position` with the selected `mockup_id`.

The panel also displays the current `product_id`, `variant_id` and `mockup_id` so you can verify which item you are editing.


The floating panel uses a grayscale theme so it stays visually distinct from the product page. The **Save** button now appears in black for higher contrast.


## Batch mockup generation

Use the `/wp-json/api/v1/mockups/batch` endpoint to submit several mockup tasks at once. Send a JSON body with a `tasks` array containing one object per job. Each task mirrors the payload required by Printful's `mockup-tasks` API:

```json
{
  "tasks": [
    {
      "catalog_product_id": 123,
      "catalog_variant_ids": [456],
      "mockup_style_ids": [1],
      "image_url": "https://example.com/mockup.png",
      "placement": "front",
      "technique": "DTG",
      "width": 12.0,
      "height": 16.0,
      "top": 0,
      "left": 0
    }
  ]
}
```

A successful call returns the created Printful task IDs:

```json
{
  "success": true,
  "task_ids": [1234567, 1234568]
}
```

Printful processes the batch asynchronously. When each task finishes, the theme receives a `mockup_task_finished` webhook. Set this webhook URL in your Printful dashboard so generated images are saved automatically.

## Printful API key

Several scripts require access to your Printful account. Define the constant `PRINTFUL_API_KEY` in `wp-config.php` so sensitive credentials never appear in the theme files:

```php
define('PRINTFUL_API_KEY', 'your-secret-key');
```

If the constant is missing, functions like `generate_mockups_printful()` return an error and log a message instead of sending unauthenticated requests.

## Printful store ID

Some API calls target a specific Printful store. Define the constant `PRINTFUL_STORE_ID` in `wp-config.php` to automatically add the `X-PF-Store-Id` header when communicating with Printful. When not defined, the header is omitted and your default store is used.

## Mockup status endpoint

Generated mockups are cached when the `mockup_task_finished` webhook fires. Check the status of a Printful task using:

The URLs are stored for a few minutes in a WordPress transient keyed by `task_id`. Once the client fetches them, the transient is removed. No database table is involved – everything is kept only in this temporary cache.

```
/wp-json/customiizer/v1/mockup-status?task_id=123
```

The response lists all `mockup_url` values stored for the task:

```json
{
  "success": true,
  "mockups": [
    {
      "variant_id": 789,
      "style_id": 1,
      "mockup_url": "https://.../image.png"
    }
  ]
}
```

