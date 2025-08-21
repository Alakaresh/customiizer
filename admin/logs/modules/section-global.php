<?php
$logsRoot = WP_CONTENT_DIR . '/uploads/customiizer/logs/';

if (!is_dir($logsRoot)) {
    echo '<p style="color:red;">Aucun dossier de logs trouvé.</p>';
    return;
}

$date = $_GET['date'] ?? '';
$user = $_GET['user'] ?? '';
$session = $_GET['session'] ?? '';
$level = $_GET['level'] ?? 'ERROR';
$requestId = trim($_GET['requestId'] ?? '');

$dates = array_map('basename', array_filter(glob($logsRoot . '*', GLOB_ONLYDIR)));
sort($dates);
$selectedDate = ($date && in_array($date, $dates, true)) ? $date : (end($dates) ?: '');

$users = [];
if ($selectedDate) {
    $users = array_map('basename', array_filter(glob($logsRoot . $selectedDate . '/*', GLOB_ONLYDIR)));
}
$selectedUser = ($user && in_array($user, $users, true)) ? $user : ($users[0] ?? '');

$sessions = [];
if ($selectedUser) {
    $sessions = array_map('basename', glob($logsRoot . $selectedDate . '/' . $selectedUser . '/*.log'));
}
$selectedSession = ($session && in_array($session, $sessions, true)) ? $session : ($sessions[0] ?? '');

$entries = [];
if ($requestId !== '') {
    $logFiles = glob($logsRoot . '*/*/*.log');
    foreach ($logFiles as $file) {
        foreach (file($file) as $line) {
            $data = json_decode($line, true);
            if (json_last_error() === JSON_ERROR_NONE && ($data['requestId'] ?? '') === $requestId) {
                $entries[] = $data;
            }
        }
    }
} else {
    $file = $logsRoot . $selectedDate . '/' . $selectedUser . '/' . $selectedSession;
    if (is_readable($file)) {
        foreach (file($file) as $line) {
            $data = json_decode($line, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $entries[] = $data;
            }
        }
    }
}

$availableLevels = [];
foreach ($entries as $e) {
    if (!empty($e['level']) && !in_array($e['level'], $availableLevels, true)) {
        $availableLevels[] = $e['level'];
    }
}
sort($availableLevels);

if ($level !== 'ALL') {
    $entries = array_filter($entries, function ($e) use ($level) {
        return ($e['level'] ?? '') === $level;
    });
}

usort($entries, function ($a, $b) {
    return strtotime($b['timestamp'] ?? '') <=> strtotime($a['timestamp'] ?? '');
});

echo '<form method="get">';
echo '<input type="hidden" name="page" value="' . esc_attr($_GET['page'] ?? '') . '">';

echo '<label>Date: <select name="date" onchange="this.form.submit()">';
foreach ($dates as $d) {
    $sel = $d === $selectedDate ? 'selected' : '';
    echo '<option value="' . esc_attr($d) . '" ' . $sel . '>' . esc_html($d) . '</option>';
}
echo '</select></label> ';

if ($users) {
    echo '<label>User ID: <select name="user" onchange="this.form.submit()">';
    foreach ($users as $u) {
        $sel = $u === $selectedUser ? 'selected' : '';
        echo '<option value="' . esc_attr($u) . '" ' . $sel . '>' . esc_html($u) . '</option>';
    }
    echo '</select></label> ';
}

if ($sessions) {
    echo '<label>Session ID: <select name="session" onchange="this.form.submit()">';
    foreach ($sessions as $s) {
        $sel = $s === $selectedSession ? 'selected' : '';
        echo '<option value="' . esc_attr($s) . '" ' . $sel . '>' . esc_html($s) . '</option>';
    }
    echo '</select></label> ';
}

echo '<label>Niveau: <select name="level" onchange="this.form.submit()">';
echo '<option value="ALL">Tous</option>';
foreach ($availableLevels as $lvl) {
    $sel = $lvl === $level ? 'selected' : '';
    echo '<option value="' . esc_attr($lvl) . '" ' . $sel . '>' . esc_html($lvl) . '</option>';
}
echo '</select></label> ';

echo '<label>requestId: <input type="text" name="requestId" value="' . esc_attr($requestId) . '"></label> ';

echo '<button type="submit">Filtrer</button>';
echo '</form><hr>';

if (empty($entries)) {
    echo '<p>Aucune entrée trouvée.</p>';
    return;
}

echo '<table style="width:100%; border-collapse: collapse;" border="1">';
echo '<thead><tr><th style="width:200px;">Date</th><th style="width:100px;">Level</th><th style="width:200px;">requestId</th><th>Message</th></tr></thead><tbody>';
foreach ($entries as $e) {
    echo '<tr>';
    echo '<td>' . esc_html($e['timestamp'] ?? '') . '</td>';
    echo '<td>' . esc_html($e['level'] ?? '') . '</td>';
    echo '<td>' . esc_html($e['requestId'] ?? '') . '</td>';
    echo '<td>' . esc_html($e['message'] ?? '') . '</td>';
    echo '</tr>';
}
echo '</tbody></table>';
?>
