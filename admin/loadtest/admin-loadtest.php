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
    echo '<div class="wrap">';
    echo '<h1>⚙️ Test de charge /render</h1>';
    echo '<button id="start-loadtest" class="button button-primary">Lancer le test (60 requêtes)</button>';
    echo '<pre id="loadtest-output" style="margin-top:20px;max-height:400px;overflow:auto;"></pre>';
    echo '<script>\n';
    echo 'document.getElementById("start-loadtest").addEventListener("click", async () => {\n';
    echo '  const out = document.getElementById("loadtest-output");\n';
    echo '  out.textContent = "Test en cours...";\n';
    echo '  const res = await fetch(ajaxurl, {\n';
    echo '    method: "POST",\n';
    echo '    credentials: "same-origin",\n';
    echo '    headers: {"Content-Type": "application/x-www-form-urlencoded"},\n';
    echo '    body: new URLSearchParams({action: "render_loadtest"})\n';
    echo '  });\n';
    echo '  const data = await res.json();\n';
    echo '  if (!data.success) { out.textContent = "Erreur: " + data.data; return; }\n';
    echo '  let txt = "";\n';
    echo '  data.data.results.forEach((r,i)=>{\n';
    echo '    txt += `${i+1}. ${r.ok ? "✅" : "❌"} ${r.time.toFixed(0)} ms${r.error ? " - " + r.error : ""}\n`;\n';
    echo '  });\n';
    echo '  txt += `---\nMoyenne: ${data.data.average_ms.toFixed(0)} ms\nEchecs: ${data.data.failures}`;\n';
    echo '  out.textContent = txt;\n';
    echo '});\n';
    echo '</script>';
    echo '</div>';
}
