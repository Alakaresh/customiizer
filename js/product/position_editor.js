jQuery(function ($) {
    window.currentProductId = window.currentProductId || null;
    const mainImg = $('#product-main-image');
    if (!mainImg.length) return;


    const panel = $('<div id="position-editor" style="position:fixed;top:20px;right:20px;background:#f0f0f0;border:1px solid #666;padding:10px;color:#333;z-index:10000;filter:grayscale(100%);"></div>');
    const info = $('<div id="position-info" style="font-size:12px;margin-bottom:5px;"></div>');
    panel.append(info);
    panel.append('<div><label>Top: <input type="range" id="pos-top" min="-200" max="200" step="0.1"> <input type="number" id="pos-top-num" min="-200" max="200" step="0.1" style="width:80px;margin-left:5px;">%</label></div>');
    panel.append('<div><label>Left: <input type="range" id="pos-left" min="-200" max="200" step="0.1"> <input type="number" id="pos-left-num" min="-200" max="200" step="0.1" style="width:80px;margin-left:5px;">%</label></div>');

    panel.append('<button id="pos-save" class="button" style="background:#000;color:#fff;">Save</button>');
    $('body').append(panel);

    const topInput = $('#pos-top');
    const leftInput = $('#pos-left');

    const topNum = $('#pos-top-num');
    const leftNum = $('#pos-left-num');

    let currentVariant = null;
    let currentMockup = null;

    function syncInputs(variant, mockup) {
        if (!variant) return;
        currentVariant = variant;
        currentMockup = mockup || (variant.mockups && variant.mockups[0]);
        if (!currentMockup) return;
        const m = currentMockup;
        topInput.val(m.position_top);
        leftInput.val(m.position_left);

        topNum.val(m.position_top);
        leftNum.val(m.position_left);

        const pid = typeof window.currentProductId !== 'undefined' ? window.currentProductId : (variant.product_id || '');
        info.text(`product_id: ${pid} | variant_id: ${variant.variant_id} | mockup_id: ${currentMockup.mockup_id}`);

        mainImg.css({ top: m.position_top + '%', left: m.position_left + '%' });
    }

    function updatePreview() {
        const t = parseFloat(topInput.val());
        const l = parseFloat(leftInput.val());
        topNum.val(t.toFixed(1));
        leftNum.val(l.toFixed(1));

        if (currentMockup) {
            currentMockup.position_top = t;
            currentMockup.position_left = l;
        }

        mainImg.css({ top: t + '%', left: l + '%' });
    }

    topInput.on('input', updatePreview);
    leftInput.on('input', updatePreview);

    topNum.on('input', () => { topInput.val(topNum.val()); updatePreview(); });
    leftNum.on('input', () => { leftInput.val(leftNum.val()); updatePreview(); });


    $('#pos-save').on('click', function () {
        if (!currentVariant || !currentMockup) return;
        const data = {

            mockup_id: currentMockup.mockup_id,
            top: parseFloat(topInput.val()),
            left: parseFloat(leftInput.val())


        };
        fetch(`/wp-json/api/v1/products/variant/${currentVariant.variant_id}/mockup-position`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(r => r.json()).then(res => {
            alert(res.success ? '✅ Position sauvegardée' : '❌ Erreur');
        }).catch(err => alert('❌ ' + err.message));
    });

    if (window.selectedVariant && window.currentMockup) {
        syncInputs(window.selectedVariant, window.currentMockup);
    }
    $(document).on('variantReady', function (e, variant) {
        const mockup = variant && variant.mockups ? variant.mockups[0] : null;
        syncInputs(variant, mockup);
    });
    $(document).on('mockupSelected', function (e, variant, mockup) {
        syncInputs(variant, mockup);
    });
});
