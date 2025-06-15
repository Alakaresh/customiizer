jQuery(document).ready(function ($) {
    const $img = $('#product-main-image');
    if (!$img.length) return;

    // Override any default bottom positioning when the editor is active
    $img.css('bottom', 'auto');

    const box = $('<div id="dev-position-editor" style="position:fixed;bottom:20px;left:20px;background:#fff;border:1px solid #ccc;padding:10px;z-index:9999;">');
    const inputTop = $('<input>', {type:'number', step:'0.1', id:'dev-pos-top', style:'width:60px;'});
    const inputLeft = $('<input>', {type:'number', step:'0.1', id:'dev-pos-left', style:'width:60px;'});
    const saveBtn = $('<button>', {text:'Save'});

    box.append('Top:', inputTop, ' Left:', inputLeft, saveBtn);
    $('body').append(box);

    function refreshInputs() {
        const top = parseFloat($img.css('top')) || 0;
        const left = parseFloat($img.css('left')) || 0;
        inputTop.val(top);
        inputLeft.val(left);
    }
    refreshInputs();

    function applyPosition() {
        $img.css({
            top: inputTop.val() + '%',
            left: inputLeft.val() + '%',
            bottom: 'auto'
        });
    }

    inputTop.on('input', applyPosition);
    inputLeft.on('input', applyPosition);

    inputTop.add(inputLeft).on('keydown', function (e) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const dir = e.key === 'ArrowUp' ? 0.1 : -0.1;
            const val = parseFloat(this.value) || 0;
            this.value = (val + dir).toFixed(1);
            $(this).trigger('input');
        }
    });

    saveBtn.on('click', function () {
        if (!window.selectedVariant) return alert('No variant');
        fetch(`/wp-json/custom-api/v1/variant/${window.selectedVariant.variant_id}/mockup-position`, {
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
