jQuery(function ($) {
    const mainImg = $('#product-main-image');
    if (!mainImg.length) return;

    const panel = $('<div id="position-editor" style="position:fixed;top:20px;right:20px;background:#fff;color:#000;padding:10px;border:1px solid #ccc;font-size:16px;z-index:10000;"></div>');
    panel.append('<div id="pos-info">Variant: <span id="variant-id"></span> – Mockup: <span id="mockup-id"></span></div>');
    panel.append('<div><label>Top: <input type="range" id="pos-top" min="-200" max="200" step="0.1"><input type="number" id="pos-top-num" min="-200" max="200" step="0.1" style="width:80px;margin-left:5px;">%</label></div>');
    panel.append('<div><label>Left: <input type="range" id="pos-left" min="-200" max="200" step="0.1"><input type="number" id="pos-left-num" min="-200" max="200" step="0.1" style="width:80px;margin-left:5px;">%</label></div>');
    panel.append('<button id="pos-save" class="button" style="background:black;color:#fff;">Save</button>');
    $('body').append(panel);

    const topInput = $('#pos-top');
    const leftInput = $('#pos-left');
    const topNum = $('#pos-top-num');
    const leftNum = $('#pos-left-num');
    let currentVariant = null;
    let currentMockup = null;

    function syncInputs(variant) {
        if (!variant || !variant.mockups || !variant.mockups.length) return;
        currentVariant = variant;
        currentMockup = variant.mockups[0];
        topInput.val(currentMockup.position_top);
        leftInput.val(currentMockup.position_left);
        topNum.val(currentMockup.position_top);
        leftNum.val(currentMockup.position_left);
        $('#variant-id').text(currentVariant.variant_id);
        $('#mockup-id').text(currentMockup.mockup_id);
        mainImg.css({ top: currentMockup.position_top + '%', left: currentMockup.position_left + '%' });
    }

    function updatePreview() {
        const t = parseFloat(topInput.val());
        const l = parseFloat(leftInput.val());
        topNum.val(t);
        leftNum.val(l);
        mainImg.css({ top: t + '%', left: l + '%' });
    }

    topInput.on('input', updatePreview);
    leftInput.on('input', updatePreview);
    topNum.on('input', function() { topInput.val($(this).val()); updatePreview(); });
    leftNum.on('input', function() { leftInput.val($(this).val()); updatePreview(); });

    $('#pos-save').on('click', function () {
        if (!currentVariant || !currentVariant.mockups || !currentVariant.mockups.length) return;
        const data = {
            mockup_id: currentMockup ? currentMockup.mockup_id : currentVariant.mockups[0].mockup_id,
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

    if (window.selectedVariant) {
        syncInputs(window.selectedVariant);
    }
    $(document).on('variantReady', function (e, variant) {
        syncInputs(variant);
    });

    $(document).on('mockupSelected', function (e, mockup) {
        if (!mockup) return;
        currentMockup = mockup;
        $('#mockup-id').text(mockup.mockup_id);
        if (window.selectedVariant) {
            currentVariant = window.selectedVariant;
            $('#variant-id').text(currentVariant.variant_id);
        }
        topInput.val(mockup.position_top);
        leftInput.val(mockup.position_left);
        topNum.val(mockup.position_top);
        leftNum.val(mockup.position_left);
        mainImg.css({ top: mockup.position_top + '%', left: mockup.position_left + '%' });
    });
});
