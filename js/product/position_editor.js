jQuery(document).ready(function ($) {
    const $img = $('#product-main-image');
    if (!$img.length) return;

    const box = $('<div id="dev-position-editor" style="position:fixed;bottom:20px;left:20px;background:#fff;color:#000;border:1px solid #ccc;padding:10px;z-index:9999;">');
    const inputTop = $('<input>', {type:'range', min:-200, max:200, step:'1', id:'dev-pos-top'});
    const topDisplay = $('<span>', {id:'dev-pos-top-value', text:'0px'});
    const inputLeft = $('<input>', {type:'range', min:-200, max:200, step:'1', id:'dev-pos-left'});

    const leftDisplay = $('<span>', {id:'dev-pos-left-value', text:'0px'});
    const saveBtn = $('<button>', {
        text:'Save',
        style:'background:#007bff;color:#fff;border:none;padding:5px 10px;margin-top:10px;border-radius:4px;'
    });

    box.append(
        $('<div>').append('Top: ', inputTop, ' ', topDisplay),
        $('<div>').append('Left: ', inputLeft, ' ', leftDisplay),
        saveBtn
    );
    $('body').append(box);

    function refreshInputs() {
        const top = parseFloat($img.css('top')) || 0;
        const left = parseFloat($img.css('left')) || 0;
        inputTop.val(top);
        topDisplay.text(top + 'px');
        inputLeft.val(left);
        leftDisplay.text(left + 'px');
    }
    refreshInputs();

    function applyPosition() {

        $img.css({top: inputTop.val() + 'px', left: inputLeft.val() + 'px'});
        topDisplay.text(inputTop.val() + 'px');
        leftDisplay.text(inputLeft.val() + 'px');
    }

    inputTop.add(inputLeft).on('input', applyPosition);

    saveBtn.on('click', function () {
        const variant = typeof selectedVariant !== 'undefined' ? selectedVariant : window.selectedVariant;
        if (!variant) return alert('No variant');
        const vid = variant.variant_id || variant;
        fetch(`/wp-json/custom-api/v1/variant/${vid}/mockup-position`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                position_top: parseFloat(inputTop.val()),
                position_left: parseFloat(inputLeft.val())
            })
        })
            .then(r => r.json())
            .then(d => console.log('Position saved', d))
            .catch(err => console.error('Save error', err));
    });
});
