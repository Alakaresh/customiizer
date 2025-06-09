<?php
require_once('/var/www/vhosts/customiizer.com/httpdocs_dev/wp-load.php');
// Accès global à la base de données via $wpdb
global $wpdb;

// Nombre de crédits à assigner
$newCredits = 30;

// Nom de la table
$table_name = 'WPC_client'; // Utilisez le nom de la table exact comme il apparaît dans la base de données

// Mise à jour de la colonne image_credits pour tous les enregistrements
$result = $wpdb->query(
    "UPDATE {$table_name} SET image_credits = {$newCredits}"
);

// Vérifier le résultat et afficher un message approprié
if ($result !== false) {
    echo "Le nombre de crédits a été mis à jour pour {$result} clients.";
} else {
    echo "Erreur lors de la mise à jour des crédits.";
}
?>
