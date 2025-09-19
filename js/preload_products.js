document.addEventListener('DOMContentLoaded', () => {
    try {
        const saved = sessionStorage.getItem('customizerCache');
        const savedData = saved ? JSON.parse(saved) : {};
        window.customizerCache = {
            ...(savedData || {}),
            ...(window.customizerCache || {})
        };
    } catch (e) {
        window.customizerCache = window.customizerCache || {};
    }

    window.customizerCache.products = window.customizerCache.products || [];
    window.customizerCache.variants = window.customizerCache.variants || {};
    window.customizerCache.variantBasics = window.customizerCache.variantBasics || {};
    window.customizerCache.formatProducts = window.customizerCache.formatProducts || {};

    function normalizeRatio(value) {
        return (value || '').toString().trim();
    }

    function persistCache() {
        const tmp = { ...window.customizerCache, models: {} };
        sessionStorage.setItem('customizerCache', JSON.stringify(tmp));
    }

    function buildLocalFormatMap(variantBasics) {
        if (!variantBasics || typeof variantBasics !== 'object') {
            return {};
        }

        const productNameMap = {};
        (window.customizerCache.products || []).forEach((product) => {
            if (!product) {
                return;
            }

            const pid = Number(product.product_id);
            if (Number.isNaN(pid)) {
                return;
            }

            productNameMap[pid] = product.name || null;
        });

        const dedupe = new Set();
        const map = {};

        Object.entries(variantBasics).forEach(([productId, variants]) => {
            const pid = Number(productId);
            const productName = productNameMap[pid] || null;

            (Array.isArray(variants) ? variants : []).forEach((variant) => {
                if (!variant) {
                    return;
                }

                const ratio = normalizeRatio(variant.ratio_image);
                if (!ratio) {
                    return;
                }

                const variantId = Number(variant.variant_id);
                if (!variantId) {
                    return;
                }

                const dedupeKey = `${ratio}:${variantId}`;
                if (dedupe.has(dedupeKey)) {
                    return;
                }
                dedupe.add(dedupeKey);

                const choice = {
                    product_id: pid,
                    product_name: productName,
                    variant_id: variantId,
                    variant_size: variant?.size || null,
                    color: typeof variant?.color === 'string' && variant.color.trim() ? variant.color : null,
                    hexa: typeof variant?.hexa === 'string' && variant.hexa.trim() ? variant.hexa : null,
                    ratio_image: ratio
                };

                if (!map[ratio]) {
                    map[ratio] = { success: true, choices: [] };
                }
                map[ratio].choices.push(choice);
            });
        });

        return map;
    }

    function rememberFormatProducts(variantBasics, context) {
        const cache = window.formatProductsCache;
        try {
            let map = {};
            if (cache && typeof cache.buildCacheEntriesFromVariants === 'function') {
                ({ map } = cache.buildCacheEntriesFromVariants(
                    variantBasics,
                    window.customizerCache.products || []
                ));
            } else {
                map = buildLocalFormatMap(variantBasics);
            }

            if (!map || typeof map !== 'object' || Object.keys(map).length === 0) {
                return 0;
            }

            window.customizerCache.formatProducts = {
                ...(window.customizerCache.formatProducts || {}),
                ...map
            };

            const added = Object.keys(map).length;
            console.log('[preload] ratios produits mémorisés', {
                contexte: context,
                formatsAjoutes: added,
                totalFormats: Object.keys(window.customizerCache.formatProducts).length
            });

            return added;
        } catch (error) {
            console.warn('[preload] impossible de mémoriser les ratios produits', { contexte: context, erreur: error });
            return 0;
        }
    }

    function tryHydrateFormatCache(reason) {
        const cache = window.formatProductsCache;
        if (!cache || typeof cache.hydrateFromVariants !== 'function') {
            return;
        }

        const variantBasics = window.customizerCache.variantBasics || {};
        if (!variantBasics || Object.keys(variantBasics).length === 0) {
            return;
        }

        try {
            cache.hydrateFromVariants(
                variantBasics,
                window.customizerCache.products || [],
                reason
            );
        } catch (error) {
            console.error('[preload] hydratation cache formats impossible', { raison: reason, erreur: error });
        }
    }

    rememberFormatProducts(window.customizerCache.variantBasics, 'session');
    persistCache();
    tryHydrateFormatCache('session');

    async function preloadAllData() {
        if (window.customizerCache.products.length === 0) {
            try {
                const res = await fetch('/wp-json/api/v1/products/list');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        window.customizerCache.products = data;
                        const added = rememberFormatProducts(window.customizerCache.variantBasics, 'products_fetch');
                        persistCache();
                        if (added > 0) {
                            tryHydrateFormatCache('products_fetch');
                        }
                    }
                }
            } catch (err) {
                console.error('Preload products error', err);
            }
        }

        if (Object.keys(window.customizerCache.variantBasics).length === 0) {
            try {
                const res = await fetch('/wp-json/api/v1/products/variants_all');
                if (res.ok) {
                    const data = await res.json();
                    const grouped = {};
                    (data || []).forEach(v => {
                        const pid = v.product_id;
                        if (!grouped[pid]) grouped[pid] = [];
                        grouped[pid].push({
                            variant_id: v.variant_id,
                            size: v.size,
                            ratio_image: v.ratio_image,
                            color: v.color || null,
                            hexa: v.hexa || null
                        });
                    });
                    window.customizerCache.variantBasics = grouped;
                    rememberFormatProducts(grouped, 'variants_fetch');
                    persistCache();
                    tryHydrateFormatCache('variants_fetch');
                }
            } catch (err) {
                console.error('Preload variants error', err);
            }
        } else {
            rememberFormatProducts(window.customizerCache.variantBasics, 'variants_existing');
            persistCache();
            tryHydrateFormatCache('variants_existing');
        }
    }

    preloadAllData();
});
