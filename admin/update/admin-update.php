<?php
/**
	 * Admin Page – Gestion des mises à jour Customiizer avec sauvegarde des exclusions
	 */

add_action('admin_menu', function () {
	add_menu_page(
		'Mise à jour Customiizer',
		'MàJ Customiizer',
		'manage_options',
		'customiizer_update_page',
		'customiizer_render_update_page',
		'dashicons-update',
		3
	);
});

function customiizer_render_update_page() {
	if (!current_user_can('manage_options')) wp_die('Accès refusé.');
	echo '<script>var ajaxurl = "' . admin_url('admin-ajax.php') . '";</script>';

	global $wpdb;
	$envs = [
		'Dev'  => 'https://dev.customiizer.com',
		'Acc'  => 'https://acc.customiizer.com',
		'Prod' => 'https://customiizer.com',
	];
	$excluded_saved = get_option('customiizer_excluded_files', []);
	$theme_dir = '/var/www/vhosts/customiizer.com/httpdocs_dev/wp-content/themes/customiizer';

	echo '<div class="wrap"><h1>📦 Mises à jour Customiizer</h1>';
	echo '<table class="widefat striped"><thead><tr><th>Environnement</th><th>Frontend</th><th>API</th></tr></thead><tbody>';

	foreach ($envs as $env => $url) {
		$data = customiizer_get_version($url);
		echo '<tr><td>' . esc_html($env) . '</td>';
		echo $data['error']
			? '<td colspan="2">❌ Erreur de connexion</td>'
			: '<td>' . esc_html($data['frontend']) . '</td><td>' . esc_html($data['api_version']) . '</td>';
		echo '</tr>';
	}
	echo '</tbody></table><br>';

	echo '<hr><form method="post" id="updateForm">';
	echo '<h2>🔧 Options</h2>
			<p>
				<label>Type :
					<select name="bump_type">
						<option value="patch">Patch</option>
						<option value="minor">Mineure</option>
						<option value="major">Majeure</option>
					</select>
				</label>
				&nbsp;
				<label>Cible :
					<select name="bump_target">
						<option value="frontend">Frontend</option>
						<option value="api">API</option>
					</select>
				</label>
			</p>';

	$sections = [
		"🚀 Nouvelles fonctionnalités",
		"🐛 Corrections de bugs",
		"🔧 Améliorations techniques",
		"📝 Autres informations"
	];
	echo '<div id="release-editor"><h3>📝 Release Notes – Version auto</h3>';
	echo '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">';
	foreach ($sections as $title) {
		echo '<div class="release-section" data-title="' . esc_attr($title) . '" style="background:#f9f9f9; padding:10px; border:1px solid #ddd; border-radius:6px;">
			<h4>' . esc_html($title) . '</h4>
			<div class="inputs"></div>
			<button type="button" class="add-release-item button">+ Ajouter</button>
		</div>';
	}
	echo '</div>';
	$release_note_draft = get_option('customiizer_release_note_draft', '');
	echo '<input type="hidden" name="release_note" id="release_note_compiled" value="' . esc_attr($release_note_draft) . '">';



	echo '<h4>🗂️ Sélection des fichiers :</h4>';
	echo '<div style="display: flex; gap: 20px;">';
	echo '<div style="flex: 1;"><h4>✅ À inclure</h4><div id="includedFiles" class="file-column" style="max-height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; background: #f8fff8;">';
	customiizer_render_file_tree_dual_column($theme_dir, '', $excluded_saved, false);
	echo '</div></div>';
	echo '<div style="display: flex; flex-direction: column; justify-content: center; align-items: center;">
			<button type="button" id="moveToExcluded" style="margin: 10px;">➡️</button>
			<button type="button" id="moveToIncluded">⬅️</button>
		</div>';
	echo '<div style="flex: 1;"><h4>🚫 À exclure</h4><div id="excludedFiles" class="file-column" style="max-height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; background: #fff8f8;">';
	customiizer_render_file_tree_dual_column($theme_dir, '', $excluded_saved, true);
	echo '</div></div></div><br>';

	echo '<div class="buttons-column">
			<button type="submit" name="trigger_update_theme_acc" class="button-mise-a-jour button-acc">🔁 MAJ Thème Acc</button>
			<button type="submit" name="trigger_update_plugins_acc" class="button-mise-a-jour button-acc">🔁 MAJ Plugins Acc</button>
			<button type="submit" name="trigger_update_db_acc" class="button-mise-a-jour button-acc">🛠️ MAJ DB Acc</button>
			<button type="submit" name="trigger_update_theme_prod" class="button-mise-a-jour button-prod">🚀 MAJ Thème Prod</button>
			<button type="submit" name="trigger_update_plugins_prod" class="button-mise-a-jour button-prod">🚀 MAJ Plugins Prod</button>
			<button type="submit" name="trigger_update_db_prod" class="button-mise-a-jour button-prod">🛠️ MAJ DB Prod</button>
		</div>';
	echo '</form><hr>';
	echo '<div id="liveUpdateOutput" style="
		background-color: #000;
		color: #0f0;
		font-family: monospace;
		padding: 10px;
		margin-top: 20px;
		max-height: 400px;
		overflow-y: auto;
		display: none;
		white-space: pre-wrap;
		border-radius: 4px;
		border: 1px solid #333;
	"></div>';


	echo '<div id="customiizer-history"><h2>📜 Historique des mises à jour</h2>';
	echo '<table class="widefat striped"><thead><tr>
		<th>Date</th>
		<th>Env</th>
		<th>Cible</th>
		<th>Type</th>
		<th>Utilisateur</th>
		<th>Fichiers exclus</th>
		<th>Release Note</th>
	</tr></thead><tbody>';

	$logs = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}customiizer_update_log ORDER BY timestamp DESC LIMIT 10");
	if (!empty($logs)) {
		foreach ($logs as $index => $log) {
			$exclusions = maybe_unserialize($log->files_excluded);
			echo '<tr><td>' . esc_html($log->timestamp) . '</td><td>' . esc_html($log->env) . '</td><td>' . esc_html($log->target) . '</td><td>' . esc_html($log->type) . '</td><td>' . esc_html($log->triggered_by) . '</td>';
			if ($log->type === 'plugin') {
				echo '<td><em>Plugins mis à jour :</em><br><em>non disponible</em></td>';
			} elseif (!empty($exclusions)) {
				echo '<td><button type="button" onclick="document.getElementById(\'exclusions_' . $index . '\').classList.toggle(\'hidden\')">🗂️ Voir/masquer</button><div id="exclusions_' . $index . '" class="hidden" style="margin-top:5px;"><pre>' . esc_html(print_r($exclusions, true)) . '</pre></div></td>';
			} else {
				echo '<td><em>Aucun fichier exclu</em></td>';
			}
			echo '<td>';
			if (!empty($log->release_note)) {
				echo '<button type="button" onclick="document.getElementById(\'release_' . $index . '\').classList.toggle(\'hidden\')">📄 Voir</button>';
				echo '<div id="release_' . $index . '" class="hidden" style="margin-top:5px; background:#f4f4f4; padding:10px;">';
				$note_data = json_decode($log->release_note, true);
				if (is_array($note_data)) {
					foreach ($note_data as $section => $items) {
						echo '<h4 style="margin-bottom:5px;">' . esc_html($section) . '</h4><ul style="margin-top:0; padding-left: 20px;">';
						foreach ($items as $line) {
							echo '<li>– ' . esc_html($line) . '</li>';
						}
						echo '</ul>';
					}
				} else {
					echo '<em>Erreur lors de l’affichage des notes.</em>';
				}
				echo '</div>';


			} else {
				echo '<em>–</em>';
			}
			echo '</td>';
			echo '</tr>';
		}
	} else {
		echo '<tr><td colspan="6"><em>Aucune mise à jour enregistrée.</em></td></tr>';
	}
	echo '</tbody></table></div>';

	echo '<style>'; 
	echo '.hidden { display: none; }';
	echo '.buttons-column {';
	echo '  display: flex;';
	echo '  flex-wrap: wrap;';
	echo '  gap: 10px;';
	echo '  margin-top: 20px;';
	echo '}';
	echo '.button-mise-a-jour {';
	echo '  font-weight: 600;';
	echo '  font-size: 15px;';
	echo '  padding: 10px 20px;';
	echo '  border-radius: 4px;';
	echo '  border: none;';
	echo '  cursor: pointer;';
	echo '  min-width: 200px;';
	echo '  text-align: left;';
	echo '  box-shadow: 1px 1px 2px rgba(0,0,0,0.1);';
	echo '  transition: background 0.2s ease;';
	echo '}';
	echo '.button-acc { background-color: #e6f0ff; color: #005f9e; border: 1px solid #0073aa; }';
	echo '.button-acc:hover { background-color: #d4e8ff; }';
	echo '.button-prod { background-color: #ffe9e9; color: #b30000; border: 1px solid #cc0000; }';
	echo '.button-prod:hover { background-color: #ffd3d3; }';
	echo '.release-input { width: 95%; max-width: 100%; }';
	echo '.release-section h4 { margin-top: 0; margin-bottom: 10px; }';
	echo '</style>';

	echo '<script>';
	echo 'function getCompiledReleaseNote() {';
	echo '  const result = {};';
	echo '  document.querySelectorAll(".release-section").forEach(section => {';
	echo '    const title = section.dataset.title;';
	echo '    const inputs = section.querySelectorAll("input.release-input");';
	echo '    const values = Array.from(inputs).map(input => input.value.trim()).filter(Boolean);';
	echo '    if (values.length > 0) result[title] = values;';
	echo '  });';
	echo '  return JSON.stringify(result, null, 2);';
	echo '}';
	echo 'function saveDraftToDB(json) {';
	echo '  const params = new URLSearchParams();';
	echo '  params.append("action", "customiizer_save_release_draft");';
	echo '  params.append("release_note", json);';
	echo '  fetch(ajaxurl, {';
	echo '    method: "POST",';
	echo '    headers: { "Content-Type": "application/x-www-form-urlencoded" },';
	echo '    body: params';
	echo '  }).then(res => res.json()).then(data => {';
	echo '    console.log("📝 Brouillon enregistré", data);';
	echo '  });';
	echo '}';
	echo '  const draftNote = document.getElementById("release_note_compiled").value;';
	echo '  if (draftNote) {';
	echo '    try {';
	echo '      const data = JSON.parse(draftNote);';
	echo '      Object.entries(data).forEach(([section, items]) => {';
	echo '        const sectionBlock = document.querySelector(\'.release-section[data-title="\'+section+\'"] .inputs\');';
	echo '        if (!sectionBlock) return;';
	echo '        items.forEach(text => {';
	echo '          const input = document.createElement("input");';
	echo '          input.type = "text";';
	echo '          input.classList.add("release-input");';
	echo '          input.style.display = "block";';
	echo '          input.style.margin = "5px 0";';
	echo '          input.value = text;';
	echo '          input.addEventListener("input", function () {';
	echo '            const compiled = getCompiledReleaseNote();';
	echo '            document.getElementById("release_note_compiled").value = compiled;';
	echo '            saveDraftToDB(compiled);';
	echo '          });';
	echo '          sectionBlock.appendChild(input);';
	echo '        });';
	echo '      });';
	echo '    } catch (err) { console.error("❌ Erreur de parsing du draft :", err); }';
	echo '  }';

	echo 'document.addEventListener("DOMContentLoaded", function () {';
	echo '  function moveItems(sourceId, targetId) {';
	echo '    const source = document.getElementById(sourceId);';
	echo '    const target = document.getElementById(targetId);';
	echo '    source.querySelectorAll("input[type=checkbox]:checked").forEach(cb => {';
	echo '      cb.checked = false;';
	echo '      const label = cb.closest("label");';
	echo '      const path = cb.dataset.path || cb.value;';
	echo '      if (!path) return;';
	echo '      const newLabel = document.createElement("label");';
	echo '      newLabel.style.display = "block";';
	echo '      newLabel.style.marginLeft = "20px";';
	echo '      const newInput = document.createElement("input");';
	echo '      newInput.type = "checkbox";';
	echo '      newInput.value = path;';
	echo '      newInput.dataset.path = path;';
	echo '      const span = document.createElement("span");';
	echo '      span.className = "file-name";';
	echo '      span.textContent = path;';
	echo '      newLabel.appendChild(newInput);';
	echo '      newLabel.appendChild(span);';
	echo '      target.appendChild(newLabel);';
	echo '      label.remove();';
	echo '    });';
	echo '  }';
	echo '  function saveExcludedFiles() {';
	echo '    const excluded = Array.from(document.querySelectorAll("#excludedFiles input[type=checkbox]"))';
	echo '      .map(cb => cb.dataset.path || cb.value)';
	echo '      .filter(Boolean);';
	echo '    const params = new URLSearchParams();';
	echo '    params.append("action", "customiizer_save_excluded");';
	echo '    excluded.forEach(path => {';
	echo '      params.append("excluded[]", path);';
	echo '    });';
	echo '    fetch(ajaxurl, {';
	echo '      method: "POST",';
	echo '      headers: { "Content-Type": "application/x-www-form-urlencoded" },';
	echo '      body: params';
	echo '    });';
	echo '  }';
	echo '  document.getElementById("moveToExcluded").addEventListener("click", () => {';
	echo '    moveItems("includedFiles", "excludedFiles");';
	echo '    saveExcludedFiles();';
	echo '  });';
	echo '  document.getElementById("moveToIncluded").addEventListener("click", () => {';
	echo '    moveItems("excludedFiles", "includedFiles");';
	echo '    saveExcludedFiles();';
	echo '  });';
	echo '  const form = document.getElementById("updateForm");';
	echo '  form.addEventListener("submit", function (e) {';
	echo '    e.preventDefault();';
	echo '    const clickedButton = document.activeElement;';
	echo '    if (!clickedButton || !clickedButton.name) return;';
	echo '    let message = "";';
	echo '    if (clickedButton.name.includes("theme_acc")) message = "Confirmer la mise à jour du thème en ACC ?";';
	echo '    else if (clickedButton.name.includes("plugins_acc")) message = "Confirmer la mise à jour des plugins en ACC ?";';
	echo '    else if (clickedButton.name.includes("theme_prod")) message = "🚨 PROD : Êtes-vous certain de lancer la mise à jour du thème ?";';
	echo '    else if (clickedButton.name.includes("plugins_prod")) message = "🚨 PROD : Êtes-vous certain de lancer la mise à jour des plugins ?";';
	echo '    if (message && !confirm(message)) return;';
	echo '    const formData = new FormData(form);';
	echo '    formData.append("action", "customiizer_run_update");';
	echo '    formData.append("trigger", clickedButton.name);';
	echo '    formData.append("bump_type", form.elements["bump_type"].value);';
	echo '    formData.append("bump_target", form.elements["bump_target"].value);';
	echo '    formData.append("release_note", document.getElementById("release_note_compiled").value);';




	echo 'document.addEventListener("DOMContentLoaded", function () {';
	echo '  const updateForm = document.getElementById("updateForm");';
	echo '  updateForm.addEventListener("input", function () {';
	echo '    const noteField = document.getElementById("release_note_compiled");';
	echo '    if (noteField) saveDraftToDB(noteField.value);';
	echo '  });';
	echo '});';


	echo '    const outputBox = document.getElementById("liveUpdateOutput");';
	echo '    outputBox.style.display = "block";';
	echo '    outputBox.innerText = "🔄 Démarrage de la mise à jour...\n";';
	echo '    fetch(ajaxurl, {';
	echo '      method: "POST",';
	echo '      body: formData';
	echo '    })';
	echo '    .then(res => res.json())';
	echo '    .then(data => {';
	echo '      if (data.success) {';
	echo '			console.log(data);';
	echo '        outputBox.innerText += "\n✅ Mise à jour terminée :\n" + data.data.output.trim();';
	echo '        if (data.release) outputBox.innerText += "\n📝 Notes de version :\n" + data.data.release;';
	echo '      } else {';
	echo '        outputBox.innerText += "\n❌ Erreur : " + (data.message || "inconnue");';
	echo '      }';
	echo '    })';
	echo '    .catch(error => {';
	echo '      outputBox.innerText += "\n❌ Erreur réseau : " + error;';
	echo '    });';
	echo '  });';
	echo '  document.querySelectorAll(".add-release-item").forEach(button => {';
	echo '    button.addEventListener("click", function () {';
	echo '      const container = this.previousElementSibling;';
	echo '      const input = document.createElement("input");';
	echo '      input.type = "text";';
	echo '      input.placeholder = "Nouvel élément...";';
	echo '      input.classList.add("release-input");';
	echo '      input.style.display = "block";';
	echo '      input.style.margin = "5px 0";';
	echo '      container.appendChild(input);';
	echo '      input.focus();';

	echo '      input.addEventListener("input", function () {'; // <---- NOUVEAU
	echo '        const compiled = getCompiledReleaseNote();';
	echo '        document.getElementById("release_note_compiled").value = compiled;';
	echo '        saveDraftToDB(compiled);';
	echo '      });';

	echo '    });';
	echo '  });';

	echo '  document.getElementById("updateForm").addEventListener("submit", function () {';
	echo '    const result = {};';
	echo '    document.querySelectorAll(".release-section").forEach(section => {';
	echo '      const title = section.dataset.title;';
	echo '      const inputs = section.querySelectorAll("input.release-input");';
	echo '      const values = Array.from(inputs).map(input => input.value.trim()).filter(text => text.length > 0);';
	echo '      if (values.length > 0) result[title] = values;';
	echo '    });';
	echo '    const compiled = JSON.stringify(result, null, 2);';
	echo '    document.getElementById("release_note_compiled").value = compiled;';
	echo '  });';
	echo '});';
	echo '</script>';


	// Traitement POST si une MAJ est déclenchée
	if ($_SERVER['REQUEST_METHOD'] === 'POST') {
		$type = sanitize_text_field($_POST['bump_type'] ?? 'patch');
		$target = sanitize_text_field($_POST['bump_target'] ?? 'frontend');
		$excluded = get_option('customiizer_excluded_files', []);
		putenv("BUMP_TYPE=$type");
		putenv("BUMP_TARGET=$target");
		putenv("RSYNC_EXCLUDES=" . implode(',', $excluded));

		$env = null;
		$script_output = "";
		if (isset($_POST['trigger_update_theme_acc'])) {
			$env = 'Acc';
			$script_output = customiizer_run_script("deploy-theme-acc.sh");
		}
		elseif (isset($_POST['trigger_update_plugins_acc'])) {
			$env = 'Acc';
			$script_output = customiizer_run_script("deploy-plugins-acc.sh");
			$target = 'plugins';
			$type = 'plugin';
		}elseif (isset($_POST['trigger_update_db_custom'])) {
			$env = 'Acc';
			$script_output = customiizer_run_script("deploy-db-acc.sh");
			$target = 'database';
			$type = 'db';
		}elseif (isset($_POST['trigger_update_theme_prod'])) {
			$env = 'Prod';
			$script_output = customiizer_run_script("deploy-theme-prod.sh");
			if (isset($_POST['trigger_update_theme_prod']) || isset($_POST['trigger_update_plugins_prod'])) {
				delete_option('customiizer_release_note_draft');
			}
		}elseif (isset($_POST['trigger_update_plugins_prod'])) {
			$env = 'Prod';
			$script_output = customiizer_run_script("deploy-plugins-prod.sh");
			$target = 'plugins';
			$type = 'plugin';
		}elseif (isset($_POST['trigger_update_db_prod'])) {
			$env = 'Prod';
			$target = 'database';
			$type = 'db';
			$script_output = customiizer_run_script("deploy-db-prod.sh");
		}



		if ($env) {
			echo "<h3>🔧 MAJ $target ($env - $type)</h3><textarea rows='15' style='width:100%;'>" . esc_textarea($script_output) . "</textarea>";
			$release_note_raw = '';
			$release_note = '';
			if (!in_array($type, ['db_sync'])) {
				$release_note_raw = wp_unslash($_POST['release_note'] ?? '');
				$release_note = json_decode($release_note_raw, true) ? $release_note_raw : '';
			}

			echo '<pre style="max-height:200px; overflow:auto; background:#f9f9f9; border:1px solid #ccc; padding:10px;">' .
				esc_html(substr($release_note_raw, 0, 1000)) .
				'</pre>';


			$inserted = $wpdb->insert("{$wpdb->prefix}customiizer_update_log", [
				'target'         => $target,
				'env'            => $env,
				'type'           => $type,
				'files_excluded' => maybe_serialize($excluded),
				'release_note'   => $release_note,
				'triggered_by'   => wp_get_current_user()->user_email
			]);

			if (!$inserted) {
				echo '<div class="notice notice-error"><p>❌ Erreur lors de l’insertion en base :</p><pre>' . esc_html($wpdb->last_error) . '</pre></div>';
			} else {
				echo '<div class="notice notice-success"><p>✅ Mise à jour enregistrée avec succès.</p></div>';
			}


		}
	}
	echo '</div> <!-- .wrap -->';


}

function customiizer_get_version($base_url) {
	$response = wp_remote_get("$base_url/wp-json/api/v1/ping?_t=" . time(), ['timeout' => 5]);
	if (is_wp_error($response)) return ['error' => true];
	$data = json_decode(wp_remote_retrieve_body($response), true);
	return [
		'frontend'    => $data['frontend'] ?? 'inconnu',
		'api_version' => $data['api_version'] ?? 'inconnu',
		'env'         => $data['env'] ?? 'inconnu',
		'error'       => false
	];
}

function customiizer_run_script($script_name) {
	$script_path = get_stylesheet_directory() . '/admin/update/scripts/' . $script_name;
	return file_exists($script_path)
		? shell_exec("bash $script_path 2>&1")
		: "❌ Script $script_name introuvable.";
}

function customiizer_render_file_tree_dual_column($dir, $prefix = '', $excluded_list = [], $render_excluded = false) {

	$abs_path = $dir;
	$rel_prefix = ltrim($prefix, '/');
	$items = array_diff(scandir($abs_path), ['.', '..']);
	$folders = [];
	$files = [];

	foreach ($items as $item) {
		if (is_dir("$abs_path/$item")) $folders[] = $item;
		else $files[] = $item;
	}

	natcasesort($folders);
	natcasesort($files);

	foreach ($folders as $folder) {
		// Appel récursif avec filtrage à l'intérieur
		ob_start();
		customiizer_render_file_tree_dual_column("$abs_path/$folder", "$rel_prefix/$folder", $excluded_list, $render_excluded);
		$inner = ob_get_clean();

		if (trim($inner) !== '') {
			echo '<details><summary>📁 ' . esc_html($folder) . '</summary>';
			echo $inner;
			echo '</details>';
		}
	}

	foreach ($files as $file) {
		$rel_path = ltrim("$rel_prefix/$file", '/');
		$is_excluded = in_array($rel_path, $excluded_list);

		if ($render_excluded && !$is_excluded) continue;
		if (!$render_excluded && $is_excluded) continue;

		echo '<label style="display:block; margin-left: 20px;" id="file-' . md5($rel_path) . '">
				<input type="checkbox" value="' . esc_attr($rel_path) . '" data-path="' . esc_attr($rel_path) . '">
				<span class="file-name">' . esc_html($rel_path) . '</span>
			</label>';
	}
}




add_action('wp_ajax_customiizer_save_excluded', function () {
	if (!current_user_can('manage_options')) {
		wp_send_json_error('Accès refusé');
	}
	$excluded = isset($_POST['excluded']) && is_array($_POST['excluded']) ? array_map('sanitize_text_field', $_POST['excluded']) : [];
	update_option('customiizer_excluded_files', $excluded);
	wp_send_json_success(['message' => 'Exclusions sauvegardées', 'count' => count($excluded)]);
});
add_action('wp_ajax_customiizer_run_update', function () {
	if (!current_user_can('manage_options')) wp_send_json_error("Non autorisé");

	$type = sanitize_text_field($_POST['bump_type'] ?? 'patch');
	$target = sanitize_text_field($_POST['bump_target'] ?? 'frontend');
	$trigger = sanitize_text_field($_POST['trigger'] ?? '');
	$excluded = get_option('customiizer_excluded_files', []);

	putenv("BUMP_TYPE=$type");
	putenv("BUMP_TARGET=$target");
	putenv("RSYNC_EXCLUDES=" . implode(',', $excluded));

	$env = '';
	$script = '';

	switch ($trigger) {
		case 'trigger_update_theme_acc':
			$env = 'Acc';
			$script = 'deploy-theme-acc.sh';
			break;
		case 'trigger_update_plugins_acc':
			$env = 'Acc';
			$script = 'deploy-plugins-acc.sh';
			$target = 'plugins'; $type = 'plugin';
			break;
		case 'trigger_update_db_acc':
			$env = 'Acc';
			$script = 'deploy-db-acc.sh';
			$target = 'database'; $type = 'db';
			break;
		case 'trigger_update_theme_prod':
			$env = 'Prod';
			$script = 'deploy-theme-prod.sh';
			break;
		case 'trigger_update_plugins_prod':
			$env = 'Prod';
			$script = 'deploy-plugins-prod.sh';
			$target = 'plugins'; $type = 'plugin';
			break;
		case 'trigger_update_db_prod':
			$env = 'Acc';
			$script = 'deploy-db-prod.sh';
			$target = 'database'; $type = 'db';
			break;


		default:
			wp_send_json_error("Type de mise à jour inconnu");
	}

	$release_note_raw = '';
	$release_note = '';
	if (!in_array($type, ['db_sync', 'db'])) {
		$release_note_raw = wp_unslash($_POST['release_note'] ?? '');
		$release_note = json_decode($release_note_raw, true) ? $release_note_raw : '';
	}


	$output = customiizer_run_script($script);

	global $wpdb;
	$wpdb->insert("{$wpdb->prefix}customiizer_update_log", [
		'target'         => $target,
		'env'            => $env,
		'type'           => $type,
		'files_excluded' => maybe_serialize($excluded),
		'release_note'   => $release_note,
		'triggered_by'   => wp_get_current_user()->user_email
	]);

	wp_send_json_success([
		'output' => $output,
		'release' => $release_note
	]);
});
add_action('wp_ajax_customiizer_save_release_draft', function () {
	if (!current_user_can('manage_options')) {
		wp_send_json_error("Non autorisé");
	}
	$draft = wp_unslash($_POST['release_note'] ?? '');
	update_option('customiizer_release_note_draft', $draft);
	wp_send_json_success(['message' => 'Brouillon sauvegardé']);
});
