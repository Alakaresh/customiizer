<?php
$logDir = __DIR__ . '/../logs-data/';
$logFiles = glob($logDir . '*.log');

if (!$logFiles) {
    echo '<p style="color:red;">Aucun fichier log trouvé.</p>';
    return;
}

$selectedFile = $_GET['file'] ?? basename($logFiles[0]);
$selectedPath = realpath($logDir . $selectedFile);

// Sélecteur
echo '<form method="get"><select name="file">';
foreach ($logFiles as $file) {
    $name = basename($file);
    $selected = ($name === $selectedFile) ? 'selected' : '';
    echo '<option value="' . esc_attr($name) . '" ' . $selected . '>' . esc_html($name) . '</option>';
}
echo '</select> <button type="submit">Afficher</button></form><hr>';

if (!in_array($selectedPath, array_map('realpath', $logFiles))) {
    echo '<p style="color:red;">Fichier non autorisé.</p>';
    return;
}

$lines = array_reverse(file($selectedPath));
echo '<table style="width:100%; border-collapse: collapse;" border="1">';
echo '<thead><tr><th style="width:200px;">Date</th><th style="width:100px;">Type</th><th>Message</th></tr></thead><tbody>';

foreach ($lines as $line) {
    if (preg_match('/^\[(.*?)\]\s+\[(.*?)\]\s+(.*)$/', trim($line), $matches)) {
        echo '<tr>';
        echo '<td>' . esc_html($matches[1]) . '</td>';
        echo '<td>' . esc_html($matches[2]) . '</td>';
        echo '<td>' . esc_html($matches[3]) . '</td>';
        echo '</tr>';
    }
}

echo '</tbody></table>';
?>
