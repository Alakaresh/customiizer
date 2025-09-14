if (typeof baseUrl === 'undefined') {
    var baseUrl = window.location.origin;
}

jQuery(document).ready(function($) {
    function initializeColumns(numColumns) {
        var columns = [];
        for (var i = 0; i < numColumns; i++) {
            var column = $('<div/>', { class: 'image-column' });
            columns.push(column);
        }
        return columns;
    }

    function displayImages(images) {
        var columns = initializeColumns(6); // Initialise trois colonnes
        var columnIndex = 0;

        images.forEach(function(image) {
            var imageDiv = $('<div/>', {
                class: 'imageContainer',
                'data-image-id': image.image_id,
                'data-image-number': image.image_number
            });

            var imgElement = $('<img>', {
                src: baseUrl + image.image_url, // Concaténation de l'URL de base si nécessaire
                alt: 'Loaded image',
                class: 'dynamic-image'
            });
            imageDiv.append(imgElement);

            columns[columnIndex].append(imageDiv);
            columnIndex = (columnIndex + 1) % columns.length; // Passe à la colonne suivante
        });

        var container = $('<div/>', { class: 'image-container' });
        columns.forEach(function(column) {
            container.append(column);
        });

        $('#image-container').empty().append(container); // Assurez-vous que l'ID correspond à votre HTML
    }

    $.ajax({
    url: ajaxurl,
    type: 'POST',
    data: { action: 'get_all_generated_images' },
    success: function(response) { // Ajoutez ceci pour inspecter la réponse
        try {
            // Assurez-vous que la réponse n'est pas déjà un objet JavaScript
            var filteredImages = response.filter(function(image) {
                return image.user_id === userId.toString(); // Assurez-vous que les IDs sont comparés comme des chaînes
            });
            displayImages(filteredImages);
        } catch (e) {
            console.error("Erreur lors du traitement des données : ", e);
        }
    },
    error: function(xhr, status, error) {
        console.error("Erreur lors de la récupération des images : ", status, error);
    }
});

});
