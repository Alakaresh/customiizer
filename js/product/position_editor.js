jQuery(document).ready(function ($) {
    const $img = $('#product-main-image');
    if (!$img.length) return;

    // Override any default bottom positioning when the editor is active
    $img.css('bottom', 'auto');

    const box = $('<div id="dev-position-editor" style="position:fixed;bottom:20px;left:20px;background:#fff;border:1px solid #ccc;padding:10px;z-index:9999;">');
    const inputTop = $('<input>', {type:'range', min:0, max:100, step:'0.1', id:'dev-pos-top'});
    const topDisplay = $('<span>', {id:'dev-pos-top-value', text:'0%'});
    const inputLeft = $('<input>', {type:'range', min:0, max:100, step:'0.1', id:'dev-pos-left'});
    const leftDisplay = $('<span>', {id:'dev-pos-left-value', text:'0%'});
    const saveBtn = $('<button>', {text:'Save'});

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
        topDisplay.text(top + '%');
        inputLeft.val(left);
        leftDisplay.text(left + '%');
    }
    refreshInputs();

    function applyPosition() {
        $img.css({
            top: inputTop.val() + '%',
            left: inputLeft.val() + '%',
            bottom: 'auto'
        });

        topDisplay.text(inputTop.val() + '%');
        leftDisplay.text(inputLeft.val() + '%');
    }

    inputTop.add(inputLeft).on('input', applyPosition);


     saveBtn.on('click', function () {
      const variant = typeof selectedVariant !== 'undefined' ? selectedVariant : window.selectedVariant;
      if (!variant) return alert('No variant');
      const vid = variant.variant_id || variant;
      const selectedThumb = $('.image-thumbnails .thumbnail.selected');
      const mid = selectedThumb.data('style-id') || (variant.mockups && variant.mockups[0]?.mockup_id);
      fetch(`/wp-json/custom-api/v1/variant/${vid}/mockup-position`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
              mockup_id: parseInt(mid),
              position_top: parseFloat(inputTop.val()),
              position_left: parseFloat(inputLeft.val())
          })
      })
          .then(r => r.json())
          .then(d => console.log('Position saved', d))
          .catch(err => console.error('Save error', err));
  });

});
