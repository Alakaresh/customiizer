let currentPage = 1; // Garder une trace de la page actuelle
const perPage = 10; // Définir combien d'éléments vous voulez par page


function fetchUserOrders(options = {}) {
        const prefetch = options.prefetch === true;
        const page = options.page || currentPage;
        const uid = window.currentUser && currentUser.ID ? currentUser.ID : 0;
        const cacheKey = `USER_ORDERS_${uid}_${page}`;
        const cached = sessionStorage.getItem(cacheKey);

        if (cached) {
                try {
                        const cacheData = JSON.parse(cached);
                        if (!prefetch) {
                                displayOrders(cacheData.orders, cacheData.max_num_pages);
                                updatePagination(cacheData.max_num_pages);
                        }

                        return;
                } catch (e) {
                        console.warn('Cache parse error for orders', e);
                }
        }

        fetch(ajaxurl, {
                method: 'POST',
                headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `action=get_user_orders&per_page=${perPage}&page=${currentPage}`
        })
                .then(response => response.json())
                .then(data => {
                if (data.success) {
                        sessionStorage.setItem(cacheKey, JSON.stringify(data.data));

                        if (!prefetch) {
                                displayOrders(data.data.orders, data.data.max_num_pages);
                                updatePagination(data.data.max_num_pages); // Mettre à jour la pagination basée sur le nombre max de pages
                        }

                } else {
                        console.error('Erreur:', data.data);
                }
        })
                .catch(error => console.error('Erreur:', error));
}

function displayOrders(orders, maxNumPages) {
	const ordersContainer = document.getElementById('purchases-container');
	if (!ordersContainer) {
		console.error('Erreur: l\'élément avec l\'ID "purchases-container" est introuvable.');
		return;
	}
	ordersContainer.innerHTML = ''; // Efface les commandes précédentes

	// Création de la structure de base du tableau
       const table = document.createElement('table');
       table.className = 'orders-table';
	const thead = document.createElement('thead');
	const tbody = document.createElement('tbody');
	const headerRow = document.createElement('tr');

	// Définition des en-têtes de colonne
	['N° Commande', 'Date', 'Statut', 'Produits', 'Total', 'Suivi', 'Facture'].forEach(headerText => {
		const header = document.createElement('th');
		header.textContent = headerText;
		headerRow.appendChild(header);
	});


	thead.appendChild(headerRow);
	table.appendChild(thead);
	table.appendChild(tbody);

	// Remplissage du tableau avec les données des commandes
	orders.forEach(order => {
		const row = document.createElement('tr');

		const idCell = document.createElement('td');
		const idText = document.createTextNode(order.number); // Créez un noeud texte pour l'ID
		idCell.appendChild(idText); // Ajoutez le texte à la cellule
		idCell.classList.add('order-id'); // Ajoutez la classe pour appliquer le style
		idCell.addEventListener('click', () => displayOrderDetails(order.id)); // Ajoutez l'écouteur d'événements
		row.appendChild(idCell);

		// Nouvelle cellule pour la date de création
		const creationDateCell = document.createElement('td');
		creationDateCell.textContent = order.creation_date; // Utilisez le format de date approprié
		row.appendChild(creationDateCell);

		const statusCell = document.createElement('td');

		// Remplacement texte côté JS
		const statusLabel = order.status === "En cours" ? "En attente" : order.status;
		statusCell.textContent = statusLabel;

		row.appendChild(statusCell);


		const itemsCountCell = document.createElement('td');
		itemsCountCell.textContent = order.items_count; // Utilisez la nouvelle propriété
		row.appendChild(itemsCountCell);

		const totalCell = document.createElement('td');
		totalCell.textContent = order.total;
		row.appendChild(totalCell);

		const trackingInfoCell = document.createElement('td');
		trackingInfoCell.className = "tracking-cell";

		console.log("🔍 Vérification tracking pour commande", order.number, {
			tracking_number: order.tracking_number,
			tracking_url: order.tracking_url,
			orderObject: order
		});

		if (order.tracking_info) {
			const trackingText = document.createElement('span');

			// Extraire le numéro de suivi depuis l’URL
			const trackingUrl = order.tracking_info;
			const trackingNumberFromUrl = trackingUrl.split('tracknumbers=')[1] || "Lien de suivi";

			trackingText.textContent = trackingNumberFromUrl;
			trackingText.className = "tracking-number";
			trackingText.style.color = "#004488"; // ✅ Couleur appliquée ici
			trackingText.style.fontWeight = "bold";
			trackingText.style.textDecoration = "underline";
			trackingText.style.cursor = "pointer";

			const trackingLink = document.createElement('a');
			trackingLink.href = trackingUrl;
			trackingLink.target = "_blank";
			trackingLink.appendChild(trackingText);

			trackingInfoCell.appendChild(trackingLink);
		} else {
			const noTrackIcon = document.createElement('span');
			noTrackIcon.textContent = "✖";
			noTrackIcon.title = "Aucune information de suivi";
			noTrackIcon.className = "no-tracking-icon";
			trackingInfoCell.appendChild(noTrackIcon);
		}


		row.appendChild(trackingInfoCell);


		const invoiceCell = document.createElement('td');

		if (order.invoice_url) {
			const invoiceLink = document.createElement('a');
			invoiceLink.href = order.invoice_url;
			invoiceLink.title = "Télécharger la facture";
			invoiceLink.innerHTML = "📄"; // ou utiliser <i class="fa fa-file-pdf"></i> si FontAwesome
			invoiceLink.className = "invoice-icon";
			invoiceLink.target = "_blank";
			invoiceCell.appendChild(invoiceLink);
		} else {
			invoiceCell.textContent = "—";
		}

		row.appendChild(invoiceCell);



		tbody.appendChild(row);
	});

	ordersContainer.appendChild(table);
	createPaginationButtons(maxNumPages);
}

function updatePagination(maxNumPages) {
	createPaginationButtons(maxNumPages); // Assurez-vous que cette ligne est présente et correctement appelée
}

// Exemple très basique de création de boutons de pagination
function createPaginationButtons(maxNumPages) {
	const ordersContainer = document.getElementById('purchases-container');
	if (!ordersContainer) {
		console.error('Erreur: l\'élément avec l\'ID "purchases-container" est introuvable.');
		return;
	}

	let paginationContainer = ordersContainer.querySelector('#pagination-container');
	if (!paginationContainer) {
		paginationContainer = document.createElement('div');
		paginationContainer.id = 'pagination-container';
		ordersContainer.appendChild(paginationContainer);
	}
	paginationContainer.innerHTML = '';

	const maxButtonsAroundCurrent = 2; // Le nombre de boutons à afficher autour de la page actuelle
	const startPage = Math.max(1, currentPage - maxButtonsAroundCurrent);
	const endPage = Math.min(maxNumPages, currentPage + maxButtonsAroundCurrent);

	// Bouton pour aller à la première page
	if (startPage > 1) {
		const firstPageBtn = document.createElement('button');
		firstPageBtn.textContent = '<<';
		firstPageBtn.addEventListener('click', function() {
			currentPage = 1;
			fetchUserOrders();
		});
		paginationContainer.appendChild(firstPageBtn);
	}

	// Générer les boutons de pagination
	for (let i = startPage; i <= endPage; i++) {
		const button = document.createElement('button');
		button.textContent = i;
		button.className = i === currentPage ? 'active' : '';
		button.addEventListener('click', function() {
			currentPage = i;
			fetchUserOrders();
		});
		paginationContainer.appendChild(button);
	}

	// Bouton pour aller à la dernière page
	if (endPage < maxNumPages) {
		const lastPageBtn = document.createElement('button');
		lastPageBtn.textContent = '>>';
		lastPageBtn.addEventListener('click', function() {
			currentPage = maxNumPages;
			fetchUserOrders();
		});
		paginationContainer.appendChild(lastPageBtn);
	}
}

function displayOrderDetails(orderId) {
	var ajaxurl = '/wp-admin/admin-ajax.php'; // URL vers le fichier admin-ajax.php de WordPress

	fetch(`${ajaxurl}?action=get_order_details&orderId=${orderId}`, {
		method: 'GET',
		credentials: 'same-origin',
	})
		.then(response => response.json())
		.then(data => {
		if (data.success) {
			const orderDetails = data.data;
			const ordersContainer = document.getElementById('purchases-container');
			ordersContainer.innerHTML = '';

			const table = document.createElement('table');
			table.className = 'order-details-table';

			// En-tête de la section des détails des produits
			const theadProducts = document.createElement('thead');
			const headerRowProducts = theadProducts.insertRow();
			headerRowProducts.insertCell().textContent = 'Item';
			headerRowProducts.insertCell().textContent = 'Quantity';
			headerRowProducts.insertCell().textContent = 'Total';
			table.appendChild(theadProducts);

			// Corps de la section des détails des produits
			const tbodyProducts = document.createElement('tbody');
			orderDetails.items.forEach(item => {
				const row = tbodyProducts.insertRow();
				console.log(item)

				const cellItem = row.insertCell();
				const image = document.createElement('img');
				image.src = item.image_url; // URL de l'image du produit
				image.alt = item.name; // Nom du produit
				image.className = 'product-image'; // Classe pour le style de l'image
				cellItem.appendChild(image);

				const textNode = document.createTextNode(` ${item.name}`);
				cellItem.appendChild(textNode);
				cellItem.className = 'product-details'; // Classe pour le style des détails du produit

				const cellQuantity = row.insertCell();
				cellQuantity.textContent = item.quantity;

				const cellTotal = row.insertCell();
				const totalHTML = new DOMParser().parseFromString(item.total, 'text/html').body.firstChild;
				cellTotal.appendChild(totalHTML);
			});
			table.appendChild(tbodyProducts);

			// Créer la section des totaux
			const tbodyTotals = document.createElement('tbody');
			table.appendChild(tbodyTotals);

			// Ajouter une séparation visuelle entre les articles et les totaux
			const separatorRow = tbodyTotals.insertRow();
			const separatorCell = separatorRow.insertCell();
			separatorCell.colSpan = 3;
			separatorCell.className = 'separator';

			// Ajouter les lignes des totaux
			['subtotal', 'discount', 'shipping', 'tax', 'total'].forEach((totalType) => {
				const row = tbodyTotals.insertRow();
				const labelCell = row.insertCell();
				labelCell.textContent = totalType.charAt(0).toUpperCase() + totalType.slice(1) + ':';
				labelCell.className = 'total-label';

				// Créer une cellule pour le montant qui reproduit la structure HTML de WooCommerce
				const valueCell = row.insertCell();
				valueCell.className = 'total-value';
				valueCell.colSpan = 2;

				// Parse le HTML renvoyé par WooCommerce et l'insère comme contenu de la cellule
				const priceContainer = new DOMParser().parseFromString(orderDetails[totalType], 'text/html').body.firstChild;
				valueCell.appendChild(priceContainer);
			});
			ordersContainer.appendChild(table);
			// ➕ Ajouter ici le bouton de facture PDF si disponible

		} else {
			console.error('Erreur:', data.data);
		}
	})
		.catch(error => console.error('Erreur lors de la récupération des détails de la commande:', error));
}
