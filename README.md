# Customiizer Theme

This WordPress theme powers the Customiizer site. Some features rely on PHP's GD extension for generating PNG images.

## PNG compression

Only mockup images converted from WebP to PNG use the `PNG_COMPRESSION_LEVEL` constant defined in `utilities.php`. This constant is read by the `convert_webp_to_png_server()` function in `includes/generate_mockup.php`. The value ranges from `0` (no compression) to `9` (maximum compression). Higher compression reduces file size but increases CPU usage when saving images.

Adjust `PNG_COMPRESSION_LEVEL` if you need smaller mockup files or faster image generation.

The default value is set to `8` for near-maximum compression.

`MOCKUP_MAX_DIMENSION` controls the maximum width or height of PNG mockup images.
Images larger than this value are downscaled before saving. The default is `1500`
pixels.
