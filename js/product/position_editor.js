jQuery(function ($) {
    const mainImg = $('#product-main-image');
    if (!mainImg.length) return;

    const panel = $('<div id="position-editor" style="position:fixed;top:20px;right:20px;background:#fff;padding:10px;border:1px solid #ccc;z-index:10000;"></div>');
    panel.append('<div><label>Top: <input type="range" id="pos-top" min="-200" max="200" step="1"><span id="pos-top-val"></span>%</label></div>');
    panel.append('<div><label>Left: <input type="range" id="pos-left" min="-200" max="200" step="1"><span id="pos-left-val"></span>%</label></div>');
    panel.append('<button id="pos-save" class="button">Save</button>');
    $('body').append(panel);

    const topInput = $('#pos-top');
    const leftInput = $('#pos-left');
    const topVal = $('#pos-top-val');
    const leftVal = $('#pos-left-val');
    let currentVariant = null;

    function syncInputs(variant) {
        if (!variant || !variant.mockups || !variant.mockups.length) return;
        currentVariant = variant;
        const m = variant.mockups[0];
        topInput.val(m.position_top);
        leftInput.val(m.position_left);
        topVal.text(m.position_top);
        leftVal.text(m.position_left);
        mainImg.css({ top: m.position_top + '%', left: m.position_left + '%' });
    }

    function updatePreview() {
        const t = parseInt(topInput.val(), 10);
        const l = parseInt(leftInput.val(), 10);
        topVal.text(t);
        leftVal.text(l);
        mainImg.css({ top: t + '%', left: l + '%' });
    }

    topInput.on('input', updatePreview);
    leftInput.on('input', updatePreview);

    $('#pos-save').on('click', function () {
        if (!currentVariant || !currentVariant.mockups || !currentVariant.mockups.length) return;
        const data = {
            mockup_id: currentVariant.mockups[0].mockup_id,
            top: parseInt(topInput.val(), 10),
            left: parseInt(leftInput.val(), 10)
        };
        fetch(`/wp-json/api/v1/products/variant/${currentVariant.variant_id}/mockup-position`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(r => r.json()).then(res => {
            alert(res.success ? '✅ Position sauvegardée' : '❌ Erreur');
        }).catch(err => alert('❌ ' + err.message));
    });

    if (window.selectedVariant) {
        syncInputs(window.selectedVariant);
    }
    $(document).on('variantReady', function (e, variant) {
        syncInputs(variant);
    });
});
