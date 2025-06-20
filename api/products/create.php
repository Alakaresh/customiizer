<?php
/**
 *  /api/v1/products/create/{catalog_id}
 *  — récupère un produit Printful + toutes ses variantes
 *  — insère / met à jour les tables locales :
 *        WPC_products
 *        WPC_variants
 *        WPC_variant_prices
 *        WPC_variant_stock   (stocks par région – ici uniquement « france »)
 *        WPC_variant_print   (premier mockup « Default »)
 *        WPC_variant_mockup  (tous les mockups « Default »)
 *
 *  ► dépendances :
 *       - PRINTFUL_API_KEY   (wp-config.php)
 *       - PRINTFUL_API_BASE  (optionnel)
 */
require_once __DIR__ . '/../../includes/printful_rate_limit.php';
register_rest_route(
	'api/v1/products',
	'/create/(?P<catalog_id>\d+)',
	[
		'methods'             => 'POST',
		'callback'            => 'create_product',
		'permission_callback' => '__return_true',    // ➜ sécuriser plus tard
	]
);

/*────────────────────────── LOG ──────────────────────────*/
function product_log( string $msg, string $ctx = 'create' ): void {
	$log = __DIR__ . '/logs/create_product.log';
	if ( ! file_exists( dirname( $log ) ) ) {
		wp_mkdir_p( dirname( $log ) );
	}
	file_put_contents(
		$log,
		sprintf( "[%s] [%s] %s\n", date_i18n( 'Y-m-d H:i:s' ), $ctx, $msg ),
		FILE_APPEND
	);
}
function db_err( string $label ): void {
	global $wpdb;
	if ( $wpdb->last_error !== '' ) {
		product_log( "❌ $label : " . $wpdb->last_error, 'sql' );
		product_log( "     ↳ " . $wpdb->last_query,       'sql' );
	}
}

/*────────────────────────── CALLBACK ─────────────────────*/
function create_product( WP_REST_Request $req ): WP_REST_Response {

	/* ---------- constantes / config ----------------------------- */
	define( 'PRINTFUL_SUPPLIER_ID', 1 );               // id du fournisseur « Printful »
	global $wpdb;
	$wpdb->show_errors();

	$catalog_id = (int) $req['catalog_id'];
	$variant_print_buffer = [];
	product_log( "→ create/$catalog_id" );

	$token = PRINTFUL_API_KEY;
	$base  = defined( 'PRINTFUL_API_BASE' ) ? PRINTFUL_API_BASE : 'https://api.printful.com/v2';
	$hdr   = [ 'Authorization' => "Bearer $token" ];

	/* ============= 1) infos produit ============================== */

        $prod_url = "$base/catalog-products/$catalog_id";
        $p_resp   = printful_request(function () use ($prod_url, $hdr) {
                return wp_remote_get( $prod_url, [ 'headers' => $hdr, 'timeout' => 15 ] );
        });
	$p_data   = json_decode( wp_remote_retrieve_body( $p_resp ), true )['data'] ?? null;
	if ( ! $p_data ) {
		product_log( '❌ produit introuvable', 'error' );
		return new WP_REST_Response( [ 'success'=>false, 'msg'=>'product not found' ], 404 );
	}
	$original_name = $p_data['name'];
	$original_description = $p_data['description'] ?? '';

	$translated = translate_name_and_description($original_name, $original_description);

	$p_name = $translated['name'];
	$p_description = $translated['description'];
	$p_description_formatted = format_printful_description($p_description);

	/* ---- UPSERT WPC_products ------------------------------------ */

	$wpdb->replace(
		'WPC_products',
		[
			'product_id'  => $catalog_id,
			'supplier_id' => PRINTFUL_SUPPLIER_ID,
			'name'        => $p_name,
			'description' => $p_description_formatted,
		],
		[ '%d','%d','%s','%s' ]
	);
	db_err( 'WPC_products' );

	/* ============= 2) MOCKUP-STYLES (« Default ») ================ */

	$mock_url = "$base/catalog-products/$catalog_id/mockup-styles";
	product_log("📥 Requête mockup-styles URL = $mock_url", 'mockup');

        $mock_resp_raw = printful_request(function () use ($mock_url, $hdr) {
                return wp_remote_get($mock_url, [ 'headers'=>$hdr, 'timeout'=>15 ]);
        });
	$mock_body = wp_remote_retrieve_body($mock_resp_raw);
	$mock_json = json_decode($mock_body, true)['data'] ?? [];

	if (empty($mock_json)) {
		product_log("❌ Aucun mockup-style récupéré — réponse brute : " . $mock_body, 'mockup');
	} else {
		product_log("✅ ".count($mock_json)." styles de mockups récupérés", 'mockup');
	}

	$mock_by_variant = [];

	foreach ($mock_json as $i => $m) {
		$technique = $m['technique'] ?? 'N/A';
		$placement = $m['placement'] ?? 'N/A';
		$width     = $m['print_area_width'] ?? 0;
		$height    = $m['print_area_height'] ?? 0;

		product_log("🔍 Style $i — technique=$technique | placement=$placement | area=(${width}x${height})", 'mockup');

		foreach ($m['mockup_styles'] ?? [] as $s) {
			$style_id = $s['id'] ?? '??';
			$variants = $s['restricted_to_variants'] ?? [];

			if (empty($variants)) {
				product_log("⚠️ Style $style_id ignoré (aucune variante liée)", 'mockup');
				continue;
			}

			product_log("➕ Style ID=$style_id applicable à ".count($variants)." variante(s)", 'mockup');

			foreach ($variants as $vid) {
				$mock_by_variant[$vid][] = [
					'mockup_id' => $style_id,
					'placement' => $placement,
					'technique' => $technique,
					'width'     => $width,
					'height'    => $height,
					'image'     => $s['preview'] ?? null,
					'pos_top'   => 0,
					'pos_left'  => 50,
				];

				// ➕ Ajout dans buffer si non déjà défini
				if (!isset($variant_print_buffer[$vid])) {
					$variant_print_buffer[$vid] = [
						'variant_id'        => $vid,
						'technique'         => $technique,
						'print_area_width'  => $width,
						'print_area_height' => $height,
						'placement'         => $placement,
					];
				}
			}
		}
	}



	/* ============= 3) VARIANTS =================================== */
	$var_url  = "$base/catalog-products/$catalog_id/catalog-variants";
        $variants_resp = printful_request(function () use ($var_url, $hdr) {
                return wp_remote_get( $var_url, [ 'headers'=>$hdr, 'timeout'=>15 ] );
        });
        $variants = json_decode(
                wp_remote_retrieve_body($variants_resp),
                true
        )['data'] ?? [];
        $raw_variant_resp = printful_request(function () use ($var_url, $hdr) {
                return wp_remote_get( $var_url, [ 'headers'=>$hdr, 'timeout'=>15 ] );
        });
        $raw_variant_response = wp_remote_retrieve_body($raw_variant_resp);

	$variants = json_decode($raw_variant_response, true)['data'] ?? [];

	foreach ( $variants as $v ) {

		$vid   = (int) $v['id'];
		$size_raw = $v['size'] ?? '';
		$size     = convert_size_to_cm($size_raw);
		$color = $v['color'];

		// 🧮 Calcul du ratio d’image simplifié
		$print_width  = (float) ($variant_print_buffer[$vid]['print_area_width'] ?? 0);
		$print_height = (float) ($variant_print_buffer[$vid]['print_area_height'] ?? 0);

		if ($print_width > 0 && $print_height > 0) {
			$target = $print_width / $print_height;
			$best_a = 1;
			$best_b = 1;
			$min_error = PHP_FLOAT_MAX;

			for ($b = 1; $b <= 999; $b++) {
				$a = round($target * $b);
				if ($a < 1 || $a > 999) continue;

				$approx = $a / $b;
				$error = abs($approx - $target) / $target;

				if ($error <= 0.02 && $error < $min_error) {
					$best_a = $a;
					$best_b = $b;
					$min_error = $error;
					if ($error === 0.0) break;
				}
			}

			// Simplification finale
			$gcd = function($a, $b) use (&$gcd) {
				return $b ? $gcd($b, $a % $b) : $a;
			};

			$div = $gcd($best_a, $best_b);
			$ratio_image = ($best_a / $div) . ':' . ($best_b / $div);
		} else {
			$ratio_image = null;
		}

		/* ------ prix ------------------------------------------------- */
                $price_url = "$base/catalog-variants/$vid/prices";
                $price_resp = printful_request(function () use ($price_url, $hdr) {
                        return wp_remote_get( $price_url, [ 'headers'=>$hdr,'timeout'=>10 ] );
                });
		$price_json= json_decode( wp_remote_retrieve_body( $price_resp ), true );
		$price     = (float) ( $price_json['data']['variant']['techniques'][0]['price'] ?? 0 );
		$shipping_body = [
			"recipient" => [ "country_code" => "FR" ],
			"order_items" => [[
				"source" => "catalog",
				"catalog_variant_id" => $vid,
				"quantity" => 1
			]],
			"currency" => "EUR"
		];

                $shipping_response = printful_request(function () use ($base, $hdr, $shipping_body) {
                        return wp_remote_post("$base/shipping-rates", [
                                'headers' => array_merge($hdr, [
                                        'Content-Type'    => 'application/json',
                                        'X-PF-Store-Id'   => PRINTFUL_STORE_ID,
                                ]),
                                'body' => json_encode($shipping_body),
                                'timeout' => 10,
                        ]);
                });


		$shipping_data = json_decode(wp_remote_retrieve_body($shipping_response), true);
		$delivery_price = $shipping_data['data'][0]['rate'] ?? null;
		$min_days = isset($shipping_data['data'][0]['min_delivery_days']) ? (int)$shipping_data['data'][0]['min_delivery_days'] : null;
		$max_days = isset($shipping_data['data'][0]['max_delivery_days']) ? (int)$shipping_data['data'][0]['max_delivery_days'] : null;

		$delivery_time = ($min_days && $max_days && $min_days !== $max_days)
			? "$min_days-$max_days"
			: ($min_days ?? $max_days);

		/* ------ disponibilité France --------------------------------- */
                $stock_url = "$base/catalog-variants/$vid/availability?selling_region_name=france";
                $stock_resp = printful_request(function () use ($stock_url, $hdr) {
                        return wp_remote_get( $stock_url, [ 'headers'=>$hdr,'timeout'=>10 ] );
                });
                $stock_json = json_decode(
                        wp_remote_retrieve_body($stock_resp),
                        true
                );
		$avail     = $stock_json['data']['techniques'][0]['selling_regions'][0]['availability'] ?? 'unknown';

		/* ------ 1) variant (parent) ---------------------------------- */
		$wpdb->replace(
			'WPC_variants',
			[
				'variant_id' => $vid,
				'product_id' => $catalog_id,
				'color'      => $color,
				'size'       => $size,
				'ratio_image' => $ratio_image,
			],
			[ '%d','%d','%s','%s','%s' ] // ← ajouté '%s' à la fin
		);
		db_err( 'WPC_variants '.$vid );

		/* ------ 2) prix ---------------------------------------------- */
		$sale_price = round($price * 1.3, 2);

		$wpdb->replace(
			'WPC_variant_prices',
			[
				'variant_id'     => $vid,
				'price'          => $price,
				'sale_price'     => $sale_price,
				'delivery_price' => $delivery_price,
				'delivery_time'  => $delivery_time,
			],
			[ '%d','%f','%f','%f','%s' ]
		);



		/* ------ 3) stock (région France) ------------------------------ */
		$wpdb->replace(
			'WPC_variant_stock',
			[
				'variant_id'   => $vid,
				'region'       => 'france',
				'availability' => $avail,
			],
			[ '%d','%s','%s' ]
		);
		db_err( 'variant_stock '.$vid );

		/* ------ 4) impression (après variant !) ----------------------- */
		if (isset($variant_print_buffer[$vid])) {
			$data = $variant_print_buffer[$vid];
			$wpdb->replace(
				'WPC_variant_print',
				$data,
				[ '%d','%s','%f','%f','%s' ]
			);
			db_err("variant_print $vid");
		}

		/* ------ 4) mockups (image + position) ------------------------------ */
		$mockup_index = []; // compteur par variant_id
		$failed_mockups = [];

		$styles = $mock_by_variant[$vid]; // liste des styles pour cette variante

		for ($i = 0; $i < count($styles); $i++) {
			$mockup_style = $styles[$i];

			$style_id  = $mockup_style['mockup_id'];
			$placement = $mockup_style['placement'];
			$technique = $mockup_style['technique'];

			$side = max(1, min($mockup_style['width'], $mockup_style['height']) - 1);
			$azure_mockup_url = 'https://customiizer.blob.core.windows.net/mockup/empty_500x500.png';

			$task_body = [
				'format' => 'png',
				'products' => [[
					'source'              => 'catalog',
					'catalog_product_id'  => $catalog_id,
					'catalog_variant_ids' => [$vid],
					'mockup_style_ids'    => [$style_id],
					'placements' => [[
						'placement'         => $placement,
						'technique'         => $technique,
						'print_area_type'   => 'simple',
						'layers' => [[
							'type'   => 'file',
							'url'    => $azure_mockup_url,
							'position' => [
								'width'  => $side,
								'height' => $side,
								'top'    => 0,
								'left'   => 0,
							]
						]]
					]]
				]]
			];

			$success = false;
			$task_id = null;
			$retry_count = 0;

			while ($retry_count < 3 && !$success) {
				$retry_count++;

                                $response = printful_request(function () use ($base, $hdr, $task_body) {
                                        return wp_remote_post("$base/mockup-tasks", [
                                                'headers' => array_merge($hdr, [
                                                        'Content-Type'   => 'application/json',
                                                        'X-PF-Store-Id'  => PRINTFUL_STORE_ID,
                                                ]),
                                                'body'    => json_encode($task_body, JSON_UNESCAPED_SLASHES),
                                                'timeout' => 20,
                                        ]);
                                });

				$status_code = wp_remote_retrieve_response_code($response);
				$task_data = json_decode(wp_remote_retrieve_body($response), true);
				$task_id = $task_data['data'][0]['id'] ?? null;

				if (!$task_id) {
					if ($status_code == 429) {
						$msg = $task_data['error']['message'] ?? '';
						if (preg_match('/after (\d+) seconds/', $msg, $m)) {
							$wait = (int) $m[1];
						} else {
							$wait = 60;
						}
                                                product_log("⏳ 429 — attente $wait sec (mockup_id=$style_id)", 'mockup');
						sleep($wait);

						// 💥 revenir au même mockup → décaler l’index
						$i--;
						continue 2; // saute à la prochaine itération de la boucle FOR
					} else {
						product_log("❌ Erreur tâche mockup_id=$style_id : " . json_encode($task_data), 'mockup_fail');
						break;
					}
				}

				// 🔄 récupération
				for ($j = 0; $j < 5; $j++) {
                                        sleep(2);
                                        $check = printful_request(function () use ($base, $hdr, $task_id) {
                                                return wp_remote_get("$base/mockup-tasks?id=$task_id", [
                                                        'headers' => array_merge($hdr, ['X-PF-Store-Id' => PRINTFUL_STORE_ID]),
                                                        'timeout' => 15,
                                                ]);
                                        });

					$res_data = json_decode(wp_remote_retrieve_body($check), true);
					$mockups = $res_data['data'][0]['catalog_variant_mockups'][0]['mockups'] ?? [];

					if (!empty($mockups)) {
						foreach ($mockups as $mockup) {
							$url = $mockup['mockup_url'];

							$mockup_index[$vid] = ($mockup_index[$vid] ?? 0) + 1;
							$index = $mockup_index[$vid];

							$subdir     = "/images/products/1_mockup/$catalog_id/$vid";
							$mockup_dir = get_stylesheet_directory() . $subdir;
							wp_mkdir_p($mockup_dir);

							$filename   = "{$catalog_id}_{$vid}_MKP_$index.png";
							$full_path  = "$mockup_dir/$filename";
							$db_path    = get_stylesheet_directory_uri() . $subdir . "/$filename";
							$relative_url = strstr($db_path, '/wp-content');

							$image_data = wp_remote_retrieve_body(wp_remote_get($url));
							if ($image_data) {
								file_put_contents($full_path, $image_data);
								product_log("💡 Saving mockup_id=$style_id for variant_id=$vid — url=$relative_url", 'mockup');

								$wpdb->replace(
									'WPC_variant_mockup',
									[
										'variant_id'    => $vid,
										'mockup_id'     => $style_id,
										'image'         => $relative_url,
										'position_top'  => 0,
										'position_left' => 50,
									],
									[ '%d','%d','%s','%d','%d' ]
								);
							}
						}


						$success = true;
						break;
					}
				}
			}

			if (!$success) {
				product_log("❌ Mockup_id=$style_id (variant_id=$vid) échoué après $retry_count tentatives", 'mockup_fail');
				$failed_mockups[] = [ 'variant_id' => $vid, 'style_id' => $style_id ];
			}
		}

		// ➕ Log en fin de traitement
		if (!empty($failed_mockups)) {
			foreach ($failed_mockups as $fail) {
				product_log("🛑 Mockup manquant : variant_id={$fail['variant_id']} — style_id={$fail['style_id']}", 'summary');
			}
		}
		db_err('variant_mockup ' . $vid);

	}

	product_log(
		"↳ variant #$vid | $color $size | price=$price | avail=$avail",
		'db'
	);
	/* ============= 4) TEMPLATES MOCKUP ============================= */
        $template_url = "$base/catalog-products/$catalog_id/mockup-templates";
        $template_resp = printful_request(function () use ($template_url, $hdr) {
                return wp_remote_get($template_url, [ 'headers' => $hdr, 'timeout' => 15 ]);
        });
	$template_data = json_decode(wp_remote_retrieve_body($template_resp), true)['data'] ?? [];

	foreach ($template_data as $tpl) {

		if (empty($tpl['catalog_variant_ids'])) continue;

		foreach ($tpl['catalog_variant_ids'] as $vid) {
			product_log("📦 Template pour variant_ids=[" . implode(',', $tpl['catalog_variant_ids']) . "] — image_url=" . ($tpl['image_url'] ?? 'NULL'), 'mockup');

			$wpdb->replace(
				'WPC_variant_templates',
				[
					'variant_id'        => $vid,
					'image_url'         => $tpl['image_url'] ?? '',
					'template_width'    => $tpl['template_width'] ?? 0,
					'template_height'   => $tpl['template_height'] ?? 0,
					'print_area_width'  => $tpl['print_area_width'] ?? 0,
					'print_area_height' => $tpl['print_area_height'] ?? 0,
					'print_area_top'    => $tpl['print_area_top'] ?? 0,
					'print_area_left'   => $tpl['print_area_left'] ?? 0,
				],
				[ '%d','%s','%d','%d','%d','%d','%d','%d' ]
			);
			db_err("variant_template $vid");
		}
	}

	product_log( "✅ FIN UPSERT catalog_id=$catalog_id", 'db' );
	echo "✅ Terminé avec succès !\n";
	if (!empty($failed_mockups)) {
		foreach ($failed_mockups as $fail) {
			product_log("🛑 Mockup manquant : variant_id={$fail['variant_id']} — style_id={$fail['style_id']}", 'summary');
		}
	}

	exit;
}

function format_printful_description(string $desc): string {
	$desc = trim($desc);
	if (!$desc) return '';

	$lines = preg_split('/\r\n|\n|\r/', $desc);
	$paragraphs = [];
	$details = [];

	foreach ($lines as $line) {
		$line = trim($line);
		if (!$line) continue;

		// Remarque spéciale
		if (stripos($line, 'Remarque') === 0) {
			$paragraphs[] = '<p><em>' . htmlentities($line) . '</em></p>';
			continue;
		}

		// Détails type "Capacité : 600ml"
		if (preg_match('/^([\p{L}\s]+)[:：]\s*(.+)$/u', $line, $m)) {
			$details[] = '<li><strong>' . htmlentities(trim($m[1])) . ' :</strong> ' . htmlentities(trim($m[2])) . '</li>';
			continue;
		}

		// Sinon paragraphe simple
		$paragraphs[] = '<p>' . htmlentities($line) . '</p>';
	}

	if (!empty($details)) {
		$paragraphs[] = '<ul>' . implode("\n", $details) . '</ul>';
	}

	return implode("\n", $paragraphs);
}
function convert_size_to_cm($size) {
	$original = $size;

	// 🧼 Nettoyage de base (normalisation)
	$size = mb_convert_encoding($size, 'UTF-8');
	$size = str_replace(['″', '“', '”', '×', '*', '·', 'X', 'x'], 'x', $size);
	$size = preg_replace('/[^\d\.x]/', '', $size);  // supprime tout sauf chiffres, points et 'x'
	$size = trim($size);

	if (preg_match_all('/\d+(?:\.\d+)?/', $size, $matches) && count($matches[0]) === 2) {
		$val1 = round(floatval($matches[0][0]) * 2.54, 1);
		$val2 = round(floatval($matches[0][1]) * 2.54, 1);
		$converted = "{$val1} x {$val2} cm";
		product_log("📐 Conversion double : \"$original\" → \"$converted\"", 'size');
		return $converted;
	}


	// ☕ Format volume : "15oz" (juste au cas où)
	if (preg_match('/^(\d+)(oz)$/i', $size, $m)) {
		$ml = round($m[1] * 29.5735);
		$converted = "{$ml} ml";
		product_log("🥤 Conversion volume : \"$original\" → \"$converted\"", 'size');
		return $converted;
	}

	product_log("⚠️ Taille non convertie : \"$original\" → inchangé", 'size');
	return $original;
}


function translate_name_and_description(string $name, string $description): array {
	$apiUrl = "https://api.mistral.ai/v1/chat/completions";
	$apiKey = MISTRAL_API_KEY;

	$headers = [
		'Content-Type'  => 'application/json',
		'Authorization' => "Bearer $apiKey"
	];

	$prompt = <<<EOT
Tu es un traducteur professionnel de fiches produits e-commerce.

Traduis les éléments suivants en français, en conservant leur sens dans un contexte de produit vendu en ligne (évite les erreurs de sens sur les mots ambigus comme "Mat").

Ne traduis pas littéralement mais correctement selon le sens du produit.
✅ Utilise des mots courants et professionnels pour des produits vendus en ligne.

Réponds uniquement au format JSON :

{
  "name": "…",
  "description": "…"
}

Nom (anglais) : $name
Description (anglais) : $description
EOT;


	$body = [
		"model" => "mistral-small-latest",
		"messages" => [
			[
				"role" => "system",
				"content" => "Tu es un traducteur professionnel. Réponds uniquement avec un objet JSON contenant les champs name et description traduits. Pas de texte hors JSON."
			],
			[
				"role" => "user",
				"content" => $prompt
			]
		],
		"temperature" => 0.2
	];

	product_log("📝 Traduction Mistral : nom='$name' | description='" . mb_substr($description, 0, 100) . "...'", 'translate');

	$response = wp_remote_post($apiUrl, [
		'headers' => $headers,
		'body'    => json_encode($body),
		'timeout' => 30,
	]);

	if (is_wp_error($response)) {
		product_log("❌ Erreur API Mistral : " . $response->get_error_message(), 'translate');
		return [ 'name' => $name, 'description' => $description ];
	}

	$raw = wp_remote_retrieve_body($response);
	$json = json_decode($raw, true);
	$content = $json['choices'][0]['message']['content'] ?? null;

	if ($content) {
		// Nettoyage : suppression éventuelle des balises Markdown
		$content_clean = preg_replace('/^```json|```$/m', '', trim($content));
		$parsed = json_decode($content_clean, true);
		product_log("🧪 JSON brut reçu (nettoyé) : " . $content_clean, 'translate');

		if (json_last_error() === JSON_ERROR_NONE && isset($parsed['name'], $parsed['description'])) {
			product_log("✅ Traduction réussie : name='" . $parsed['name'] . "'", 'translate');
			product_log("✅ Description traduite : " . mb_substr($parsed['description'], 0, 100) . "...", 'translate');
			return $parsed;
		} else {
			product_log("⚠️ JSON invalide reçu : $content", 'translate');
		}
	} else {
		product_log("⚠️ Réponse vide de Mistral : $raw", 'translate');
	}

	return [ 'name' => $name, 'description' => $description ]; // fallback
}

