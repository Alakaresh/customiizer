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

Orders dispatched through `includes/webhook/send_order.php` are also
normalized. If a design image URL stored in product metadata uses WebP,
the script converts it to PNG on the fly before contacting Printful. The
original WebP files remain stored unchanged.

## Position editor

Enable the checkbox "Activer l'éditeur de position" in the **Custom Produits** admin page to adjust the mockup position on product pages. When enabled, `js/product/position_editor.js` is enqueued automatically.

The editor shows two range sliders controlling the top and left position (in %). Values range from -200 to 200. Each slider also has a numeric field for manual entry so you can input precise percentages. These numeric fields are now wider (80&nbsp;px) for easier editing. When enabled, the sliders allow changes down to a tenth of a percent for fine tuning. The slider values now update to match whichever mockup thumbnail is selected, letting you edit positions individually. After tweaking the values, press **Save** to send them to `/variant/<id>/mockup-position` with the selected `mockup_id`.

The panel also displays the current `product_id`, `variant_id` and `mockup_id` so you can verify which item you are editing.


The floating panel uses a grayscale theme so it stays visually distinct from the product page. The **Save** button now appears in black for higher contrast.


## Mockup generation

Send a single request to the `generate_mockup` AJAX action to create one Printful task at a time. POST to `/wp-admin/admin-ajax.php` with `action=generate_mockup` and the fields required by Printful (image URL, product ID, variant ID, `mockup_style_ids`, placement, technique, width, height, top and left). The response returns the created `task_id` that can be checked with `/wp-json/customiizer/v1/mockup-status` once the Printful webhook completes.

During this process, the browser logs how long each step takes. A message appears when the task is created and another when the mockup image finally displays. Each log indicates the total time since the click and the time spent after the task was created. The script also prints the `X-Rate-Limit-Remaining` and `X-Rate-Limit-Reset` headers returned by Printful so you can monitor usage limits.


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

## Loyalty points

Users earn 5 points for every euro spent before tax once an order is completed.
A field on the checkout page lets them redeem their points (100 points equal 1€). The
current balance is shown on the My Account dashboard. Points and history are
stored in dedicated tables prefixed with `WPC_` so the system can later support
badges, missions or other gamification features. The tables are created
manually on deployment.

## Mission categories

Missions can now be grouped under a short text category. The admin page for
missions includes a new field to specify this value when creating a mission and
lists the category of existing missions. The REST endpoint
`customiizer_get_missions` returns the category alongside other mission data so
the front‑end can display it.

On the account page, missions are displayed grouped by these categories. Each
category shows a heading followed by its missions cards.

`customiizer_get_missions_version` returns a small hash representing the latest
missions state for the current user. The front‑end displays cached missions
immediately, then compares the stored version against this value to decide
whether it needs to reload the list.

## Mission triggers

Each mission can be tied to a predefined action such as user registration or
order completion. Select the desired action when creating the mission in the
admin page. Missions with a trigger are automatically updated when the action
occurs.

The available actions are:

* **Création de compte** – fired on `user_register`.
* **Commande terminée** – fired after an order is marked completed.

## Referral system

Users can share their personal link provided in the loyalty widget. New visitors
arriving with `?ref=<id>` have this value stored in a cookie for seven days.
When they sign up, the referenced user ID is saved as `referrer_id` on the new
account. The pair `(referrer_id, referred_id)` is inserted into the
`WPC_referrals` table and the referrer gains 100 loyalty points. The number of
referrals displayed in the widget is computed from this table.

To create the table manually:

```sql
CREATE TABLE `WPC_referrals` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `referrer_id` BIGINT UNSIGNED NOT NULL,
  `referred_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `referrer_id` (`referrer_id`),
  KEY `referred_id` (`referred_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```


