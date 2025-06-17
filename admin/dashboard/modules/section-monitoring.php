<?php
echo '<h2>🛡️ État du système</h2>';
?>

<div class="status-box">
  <ul>
    <li><strong>Service Send Order :</strong> <span id="monitor-send-order">⏳</span></li>
    <li><strong>RabbitMQ :</strong> <span id="monitor-rabbitmq">⏳</span></li>
    <li><strong>Dernière activité log :</strong> <span id="monitor-last-log">⏳</span></li>
  </ul>
</div>

<script>
document.addEventListener("DOMContentLoaded", function () {
  fetch('/wp-json/api/v1/monitoring/status')
    .then(res => res.json())
    .then(data => {
      document.getElementById('monitor-send-order').innerText = data.send_order;
      document.getElementById('monitor-rabbitmq').innerText = data.rabbitmq;
      document.getElementById('monitor-last-log').innerText = data.last_activity;
    })
    .catch(() => {
      document.getElementById('monitor-send-order').innerText = '❌ Erreur';
      document.getElementById('monitor-rabbitmq').innerText = '❌ Erreur';
      document.getElementById('monitor-last-log').innerText = '❌';
    });
});
</script>

<hr style="margin-top:30px;margin-bottom:30px;">

<h3>🔧 Contrôle manuel</h3>
<form method="post">
    <?php wp_nonce_field('restart_send_order_action', 'restart_send_order_nonce'); ?>
    <button type="submit" name="restart_service" class="button button-primary">🔁 Redémarrer le service send-order</button>
</form>

<?php
if (isset($_POST['restart_service']) && check_admin_referer('restart_send_order_action', 'restart_send_order_nonce')) {
    $output = shell_exec('sudo systemctl restart send-order.service 2>&1');
    echo '<div class="notice notice-success"><p>Service redémarré.</p><pre>' . htmlspecialchars($output) . '</pre></div>';
}
?>

<hr style="margin-top:30px;margin-bottom:30px;">
