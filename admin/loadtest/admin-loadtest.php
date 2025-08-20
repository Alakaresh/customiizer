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
    echo <<<HTML
<div class="wrap">
  <h1>⚙️ Test de charge /render</h1>
  <button id="start-loadtest" class="button button-primary">Lancer le test (60 requêtes)</button>
  <pre id="loadtest-output" style="margin-top:20px;max-height:400px;overflow:auto;"></pre>
  <script>
    document.getElementById("start-loadtest").addEventListener("click", async function() {
      var out = document.getElementById("loadtest-output");
      out.textContent = "Test en cours...";
      var res = await fetch(ajaxurl, {
        method: "POST",
        credentials: "same-origin",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: new URLSearchParams({action: "render_loadtest"})
      });
      var data = await res.json();
      if (!data.success) {
        out.textContent = "Erreur: " + data.data;
        return;
      }
      var txt = "";
      data.data.results.forEach(function(r,i){
        txt += (i+1) + ". " + (r.ok ? "OK" : "FAIL") + " " + r.time.toFixed(0) + " ms" + (r.error ? " - " + r.error : "") + "\\n";
      });
      txt += "---\\nMoyenne: " + data.data.average_ms.toFixed(0) + " ms\\nEchecs: " + data.data.failures;
      out.textContent = txt;
    });
  </script>
</div>
HTML;
}
