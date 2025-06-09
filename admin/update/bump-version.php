<?php
require_once(__DIR__ . '/../../../../../wp-load.php');

parse_str(implode('&', array_slice($argv, 1)), $params);
$type   = $params['type'] ?? 'patch';       // patch, minor, major
$target = $params['target'] ?? 'frontend';  // frontend ou api

$path = get_stylesheet_directory() . '/version.json';
if (!file_exists($path)) {
    exit("❌ version.json non trouvé.\n");
}

$data = json_decode(file_get_contents($path), true);
$current = explode('.', $data[$target] ?? '1.0.0');

// 🔁 Nouvelle logique : incrément uniquement en ACC
$deployEnv = strtolower(getenv('DEPLOY_ENV') ?: 'dev');

if ($deployEnv === 'acc') {
    switch ($type) {
        case 'major':
            $current[0]++;
            $current[1] = 0;
            $current[2] = 0;
            break;
        case 'minor':
            $current[1]++;
            $current[2] = 0;
            break;
        default:
            $current[2]++;
    }

    $data[$target] = implode('.', $current);
    // 💾 Sauvegarde dans un fichier temporaire
    file_put_contents(__DIR__ . "/last_version_$target.txt", $data[$target]);
} else {
    // En PROD → on charge la version stockée depuis ACC
    $version_path = __DIR__ . "/last_version_$target.txt";
    if (file_exists($version_path)) {
        $data[$target] = trim(file_get_contents($version_path));
    } else {
        exit("❌ Erreur : version précédente non trouvée.\n");
    }
}

$data['generated_at'] = date('Y-m-d H:i:s');
$data['env'] = $deployEnv;

file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT));
echo "✅ {$target} mis à jour : {$data[$target]} (env: {$data['env']})\n";
