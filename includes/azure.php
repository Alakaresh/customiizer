<?php
use MicrosoftAzure\Storage\Blob\BlobRestProxy;

// Fonction pour créer un client Azure Blob
function azure_get_blob_client() {
    $connectionString = AZURE_CONNECTION_STRING;

    // Validation de la chaîne de connexion
    if (empty($connectionString)) {
        customiizer_log("Erreur : La chaîne de connexion Azure est manquante.");
        return false;
    }

    try {
        $blobClient = BlobRestProxy::createBlobService($connectionString);
        return $blobClient;
    } catch (\MicrosoftAzure\Storage\Common\Exceptions\ServiceException $e) {
        customiizer_log("Erreur du service Azure Blob : " . $e->getMessage(), 'ERROR');
        return false;
    } catch (Exception $e) {
        customiizer_log("Erreur générale : " . $e->getMessage(), 'ERROR');
        return false;
    }
}

// Fonction pour téléverser un fichier sur Azure
function azure_upload_blob($blobClient, $containerName, $blobName, $filePath) {
    try {
        // Vérification de l'existence du fichier temporaire
        if (!file_exists($filePath)) {
            customiizer_log("Erreur : Le fichier temporaire $filePath n'existe pas.");
            return false;
        }

        // Vérification de la taille du fichier temporaire
        $fileSize = filesize($filePath);
        if ($fileSize === 0) {
            customiizer_log("Erreur : Le fichier temporaire est vide.");
            return false;
        }

        // Ouvrir le fichier pour téléversement
        $content = fopen($filePath, "r");
        if (!$content) {
            customiizer_log("Erreur : Impossible d'ouvrir le fichier $filePath.");
            return false;
        }

        $blobClient->createBlockBlob($containerName, $blobName, $content);
        
        return true;
    } catch (\MicrosoftAzure\Storage\Common\Exceptions\ServiceException $e) {
        customiizer_log("Erreur du service Azure Blob lors du téléversement : " . $e->getMessage(), 'ERROR');
        return false;
    } catch (Exception $e) {
        customiizer_log("Erreur générale lors du téléversement : " . $e->getMessage(), 'ERROR');
        return false;
    }
}
