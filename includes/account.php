<?php
//Mon compte---------------------------------------------------------------------

function get_images() {
    global $wpdb;
    $current_user = wp_get_current_user();
    $userId = $current_user->ID;
    $imagesPerPage = isset($_GET['images_per_page']) ? (int)$_GET['images_per_page'] : 20;
    $pageNumber = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $offset = ($pageNumber - 1) * $imagesPerPage;
    $results = $wpdb->get_results($wpdb->prepare("SELECT image_url FROM WPC_generated_image WHERE user_id = %d ORDER BY image_date DESC LIMIT %d OFFSET %d", $userId, $imagesPerPage, $offset));
    $output = '<div class="image-container">';
    foreach ($results as $row) {
        $output .= '<img class="custom-image" src="' . $row->image_url . '" alt="Image générée">';
    }
    $output .= '</div>';
    echo $output;
    wp_die(); 
}
add_action('wp_ajax_get_images', 'get_images');
add_action('wp_ajax_nopriv_get_images', 'get_images'); 

//logo_client---------------------------------------------------------------------

// Fonction pour gérer la requête AJAX et enregistrer l'image
function save_user_image() {
    if (isset($_POST['user_id']) && isset($_POST['image_data'])) {
        // Récupérer les données de l'utilisateur
        $user_id = get_current_user_id();
        $image_data = $_POST['image_data'];
        
        // Enregistrement de l'image dans le répertoire souhaité
        $upload_dir_path = ABSPATH . 'wp-sauvegarde/user/' . $user_id . '/';

        // Créer le dossier s'il n'existe pas
        if (!file_exists($upload_dir_path)) {
            mkdir($upload_dir_path, 0755, true);
        }

        $filename = 'user' . $user_id . '_logo.png'; // Chemin complet du fichier
        $file_path = $upload_dir_path . $filename;

        // Écrire les données de l'image dans le fichier
        if (file_put_contents($file_path, base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $_POST['image_data'])))) {
            // Enregistrement de l'URL de l'image dans la base de données
            global $wpdb;
            $table_name = $wpdb->prefix . 'WPC_client'; // Remplacez 'client' par le nom de votre table WPC_client

            // Format de l'URL à enregistrer dans la base de données
            $image_url = home_url('wp-sauvegarde/user/' . $user_id . '/user' . $user_id . '_logo.png');
			
			// Avant la requête de mise à jour
			var_dump($image_url); // Vérifier l'URL de l'image
            
			// Requête de mise à jour pour mettre à jour la colonne user_logo
            $wpdb->update('WPC_client', ['user_logo' => $image_url], ['user_id' => $user_id]);
           
            var_dump($result); // Vérifier le résultat de la requête de mise à jour

            if ($result !== false) {
                echo 'Image enregistrée avec succès !';
            } else {
                echo 'Une erreur est survenue lors de l\'enregistrement de l\'image data base.';
            }
        } else {
            echo 'Une erreur est survenue lors de l\'enregistrement de l\'image.';
        }

        wp_die(); // Toujours inclure wp_die() à la fin de la fonction AJAX
    }
}
add_action('wp_ajax_save_user_image', 'save_user_image');
add_action('wp_ajax_nopriv_save_user_image', 'save_user_image');

function get_user_profile_image_url() {
    $user_id = get_current_user_id(); // Obtient l'ID de l'utilisateur connecté
    if ($user_id) {
        global $wpdb;

        // Requête pour récupérer l'URL de l'image de profil
        $image_url = $wpdb->get_var($wpdb->prepare(
            "SELECT user_logo FROM WPC_client WHERE user_id = %d",
            $user_id
        ));

        if ($image_url) {
            wp_send_json_success(['image_url' => $image_url]);
        } else {
            wp_send_json_error('Aucune image de profil trouvée.', ['user_id' => $user_id, 'query' => "SELECT user_logo FROM {$table_name} WHERE user_id = $user_id"]);
        }
    } else {
        wp_send_json_error('Utilisateur non connecté.');
    }

    wp_die(); // Met fin à l'exécution du script
}

add_action('wp_ajax_get_user_profile_image_url', 'get_user_profile_image_url');
add_action('wp_ajax_nopriv_get_user_profile_image_url', 'get_user_profile_image_url'); // Si accessible aux utilisateurs non connectés

function ultimate_save_user_image() {
    // Assure-toi d'inclure des vérifications de sécurité ici

    $user_id = $_POST['user_id'];
    $image_data = $_POST['image_data'];

    $image_data = str_replace('data:image/png;base64,', '', $image_data);
    $image_data = str_replace(' ', '+', $image_data);
    $decoded_image = base64_decode($image_data);

    // Construis le chemin du dossier de l'utilisateur
    $upload_dir = wp_upload_dir();
    $user_dir = $upload_dir['basedir'] . '/ultimatemember/' . $user_id;
    if (!file_exists($user_dir)) {
        wp_mkdir_p($user_dir);
    }
    $file_path = $user_dir . '/profile_photo.png';

    // Enregistre l'image dans le dossier de l'utilisateur
    file_put_contents($file_path, $decoded_image);

    // Crée les versions redimensionnées de l'image
    $sizes = [190, 80, 40]; // Les tailles que tu veux créer
    foreach ($sizes as $size) {
        $resized_image = resize_image($file_path, $size, $size);
        $resized_path = $user_dir . "/profile_photo-{$size}x{$size}.png";
        imagepng($resized_image, $resized_path);
        imagedestroy($resized_image); // Libère la mémoire
    }

    echo 'Image enregistrée avec succès';
    wp_die(); // Termine correctement la requête AJAX
}

add_action('wp_ajax_ultimate_save_user_image', 'ultimate_save_user_image');

function resize_image($file_path, $width, $height) {
    $src_image = imagecreatefrompng($file_path);
    $dst_image = imagecreatetruecolor($width, $height);

    // Copie et redimensionne l'ancienne image dans la nouvelle image
    imagecopyresampled($dst_image, $src_image, 0, 0, 0, 0, $width, $height, imagesx($src_image), imagesy($src_image));

    // Libère la mémoire
    imagedestroy($src_image);

    return $dst_image;
}