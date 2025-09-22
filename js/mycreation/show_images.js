if (typeof baseUrl === 'undefined') {
    var baseUrl = window.location.origin;
}

if (typeof userId === 'undefined') {
    var userId = window.currentUser && currentUser.ID ? currentUser.ID : 0;
}

jQuery(document).ready(function($) {
    function deleteImage(imageDiv, imageNumber) {
        var requestSucceeded = false;

        imageDiv.addClass('is-deleting');

        var button = imageDiv.find('.image-delete-button');
        button.prop('disabled', true).text(button.data('loading-label'));

        $.ajax({
            url: ajaxurl,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'delete_user_generated_image',
                image_number: imageNumber
            }
        })
            .done(function(response) {
                if (response && response.success) {
                    requestSucceeded = true;
                    imageDiv.fadeOut(200, function() {
                        $(this).remove();
                    });
                    return;
                }

                var message = response && response.data && response.data.message
                    ? response.data.message
                    : 'Une erreur est survenue lors de la suppression.';
                alert(message);
            })
            .fail(function() {
                alert('Impossible de supprimer cette image pour le moment.');
            })
            .always(function() {
                imageDiv.removeClass('is-deleting');
                if (!requestSucceeded) {
                    button.prop('disabled', false).text(button.data('default-label'));
                }
            });
    }

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

            var deleteButton = $('<button/>', {
                type: 'button',
                class: 'image-delete-button',
                text: 'Supprimer'
            });

            deleteButton.data('default-label', 'Supprimer');
            deleteButton.data('loading-label', 'Suppression...');

            deleteButton.on('click', function(event) {
                event.preventDefault();
                event.stopPropagation();

                if (!confirm('Voulez-vous vraiment supprimer cette image ?')) {
                    return;
                }

                deleteImage(imageDiv, image.image_number);
            });

            imageDiv.append(deleteButton);

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
        dataType: 'json',
        data: { action: 'get_all_generated_images' }
    })
        .done(function(response) {
            try {
                if (!Array.isArray(response)) {
                    if (response && response.data && response.data.message) {
                        console.warn('Aucune image récupérée :', response.data.message);
                    }
                    return;
                }

                var currentUserId = String(userId || '');

                var filteredImages = response.filter(function(image) {
                    return String(image.user_id) === currentUserId;
                });

                displayImages(filteredImages);
            } catch (e) {
                console.error('Erreur lors du traitement des données : ', e);
            }
        })
        .fail(function(xhr, status, error) {
            console.error('Erreur lors de la récupération des images : ', status, error);
        });

});
