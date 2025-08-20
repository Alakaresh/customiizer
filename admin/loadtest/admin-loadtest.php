<?php
add_action('admin_menu', function () {
    add_menu_page(
        'Test /render',
        '⚙️ Load Test',
        'manage_options',
        'customiizer-render-test',
        'customiizer_render_test_page',
        'dashicons-performance',
        3
    );
});

function customiizer_render_test_page() {
    $default_image = esc_url('https://customiizer.blob.core.windows.net/imageclient/1/4_54f189c6-4f5f-4cd1-a4b2-ac3fc0d4b21d.webp');
    echo <<<HTML
<div class="wrap">
  <h1>⚙️ Test de charge /render</h1>
  <p>
    <label for="variant-id">Variant ID :</label>
    <input type="number" id="variant-id" value="1" min="1" />
  </p>
  <p>
    <label for="image-url">Image URL :</label>
    <input type="text" id="image-url" size="80" value="$default_image" />
  </p>
  <button id="start-loadtest" class="button button-primary">Lancer le test (60 requêtes)</button>
  <pre id="loadtest-output" style="margin-top:20px;max-height:400px;overflow:auto;"></pre>
  <script>
    document.getElementById('start-loadtest').addEventListener('click', async function() {
      var out = document.getElementById('loadtest-output');
      out.textContent = 'Test en cours...';
      var variantId = document.getElementById('variant-id').value;
      var imageUrl = document.getElementById('image-url').value;
      var res = await fetch(ajaxurl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({action: 'render_loadtest', variantId: variantId, imageUrl: imageUrl})
      });
      var data = await res.json();
      if (!data.success) { out.textContent = 'Erreur: ' + data.data; return; }
      var txt = '';
      data.data.results.forEach(function(r,i){
        txt += (i+1) + '. ' + (r.ok ? 'OK' : 'FAIL') + ' ' + r.time.toFixed(0) + ' ms' + (r.error ? ' - ' + r.error : '') + '\n';
      });
      txt += '---\nMoyenne: ' + data.data.average_ms.toFixed(0) + ' ms\nEchecs: ' + data.data.failures;
      out.textContent = txt;
    });
  </script>
</div>
HTML;
}
