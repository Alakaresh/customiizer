<?php
use MicrosoftAzure\Storage\Blob\BlobRestProxy;

// Fonction pour créer un client Azure Blob
function azure_get_blob_client() {
    $connectionString = "DefaultEndpointsProtocol=https;AccountName=customiizer;AccountKey=hJezxhiRNQwweRTDO+tqr1tAKnX9tXWkhMbKssLRzOZOXXS47bqxN0bfIMmjzNkJG6ZeoN30THxF+AStmocKZQ==;EndpointSuffix=core.windows.net";
    $userId    = get_current_user_id();
    $sessionId = customiizer_session_id();

    // Validation de la chaîne de connexion
    if (empty($connectionString)) {
        customiizer_log('azure', $userId, $sessionId, 'ERROR', "Erreur : La chaîne de connexion Azure est manquante.");
        return false;
    }

    try {
        $blobClient = BlobRestProxy::createBlobService($connectionString);
        return $blobClient;
    } catch (\MicrosoftAzure\Storage\Common\Exceptions\ServiceException $e) {
        customiizer_log('azure', $userId, $sessionId, 'ERROR', "Erreur du service Azure Blob : " . $e->getMessage());
        return false;
    } catch (Exception $e) {
        customiizer_log('azure', $userId, $sessionId, 'ERROR', "Erreur générale : " . $e->getMessage());
        return false;
    }
}

// Fonction pour téléverser un fichier sur Azure
function azure_upload_blob($blobClient, $containerName, $blobName, $filePath) {
    try {
        $userId    = get_current_user_id();
        $sessionId = customiizer_session_id();
        // Vérification de l'existence du fichier temporaire
        if (!file_exists($filePath)) {
            customiizer_log('azure', $userId, $sessionId, 'ERROR', "Erreur : Le fichier temporaire $filePath n'existe pas.");
            return false;
        }

        // Vérification de la taille du fichier temporaire
        $fileSize = filesize($filePath);
        if ($fileSize === 0) {
            customiizer_log('azure', $userId, $sessionId, 'ERROR', "Erreur : Le fichier temporaire est vide.");
            return false;
        }

        // Ouvrir le fichier pour téléversement
        $content = fopen($filePath, "r");
        if (!$content) {
            customiizer_log('azure', $userId, $sessionId, 'ERROR', "Erreur : Impossible d'ouvrir le fichier $filePath.");
            return false;
        }

        $blobClient->createBlockBlob($containerName, $blobName, $content);
        
        return true;
    } catch (\MicrosoftAzure\Storage\Common\Exceptions\ServiceException $e) {
        customiizer_log('azure', $userId, $sessionId, 'ERROR', "Erreur du service Azure Blob lors du téléversement : " . $e->getMessage());
        return false;
    } catch (Exception $e) {
        customiizer_log('azure', $userId, $sessionId, 'ERROR', "Erreur générale lors du téléversement : " . $e->getMessage());
        return false;
    }
}
