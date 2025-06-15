document.addEventListener("DOMContentLoaded", () => {
        const toggle = document.getElementById("customiizer-dev-editor-toggle");
        const status = document.getElementById("dev-editor-status");
        function showStatus(text, color) {
                if (!status) return;
                status.textContent = text;
                status.style.color = color;
                setTimeout(() => { status.textContent = ""; }, 2000);
        }
        if (toggle) {
                fetch("/wp-json/api/v1/settings/dev-editor")
                        .then(res => res.json())
                        .then(data => { toggle.checked = !!data.enabled; })
                        .catch(() => {});
                toggle.addEventListener("change", () => {
                        const enabled = toggle.checked ? 1 : 0;
                        fetch("/wp-json/api/v1/settings/dev-editor", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ enabled })
                        })
                                .then(res => res.ok ? res.json() : Promise.reject())
                                .then(data => {
                                        toggle.checked = !!data.enabled;
                                        showStatus("Enregistré", "green");
                                })
                                .catch(() => {
                                        toggle.checked = !toggle.checked;
                                        showStatus("Erreur", "red");
                                });
                });
        }

        const root = document.getElementById("customiizer-product-admin-root");
        if (!root) return;

	root.innerHTML = `
			<div id="product-form-container"></div>
			<hr>
			<div id="product-table"></div>
		`;

	renderProductForm();  // 🔁 Formulaire ajout produit
	loadProducts();       // 🔁 Liste des produits avec variantes
});

function renderProductForm () {
	const container = document.getElementById('product-form-container');
	// Ajout au-dessus du tableau
	// 🔁 Bouton de mise à jour des stocks
	const stockButton = document.createElement("button");
	stockButton.className = "button button-secondary";
	stockButton.textContent = "🔄 Mettre à jour tous les stocks";
	stockButton.style.margin = "10px 0";

	stockButton.addEventListener("click", () => {
		if (!confirm("Confirmer la mise à jour des stocks depuis Printful ?")) return;

		stockButton.disabled = true;
		stockButton.textContent = "⏳ Mise à jour en cours...";

		fetch("/wp-json/api/v1/products/update/stocks", {
			method: "POST"
		})
			.then(res => res.json())
			.then(data => {
			if (data.success) {
				alert(`✅ ${data.updated} stocks mis à jour.`);
				stockButton.textContent = "✅ Stocks mis à jour";
				loadProducts(); // recharge les produits
			} else {
				alert("❌ " + (data.message || "Erreur API"));
				stockButton.textContent = "❌ Erreur";
			}
		})
			.catch(err => {
			alert("❌ Erreur réseau : " + err.message);
			stockButton.textContent = "❌ Erreur";
		})
			.finally(() => {
			stockButton.disabled = false;
			setTimeout(() => {
				stockButton.textContent = "🔄 Mettre à jour tous les stocks";
			}, 3000);
		});
	});

	// 🔁 Bouton mise à jour des prix d'achat
	const priceButton = document.createElement("button");
	priceButton.className = "button button-secondary";
	priceButton.textContent = "🔁 Mettre à jour les prix d'achat";
	priceButton.style.margin = "10px 10px 10px 0";

	priceButton.addEventListener("click", () => {
		if (!confirm("Confirmer la mise à jour des prix depuis Printful ?")) return;

		priceButton.disabled = true;
		priceButton.textContent = "⏳ Mise à jour en cours...";

		fetch("/wp-json/api/v1/products/update/prices", {
			method: "POST"
		})
			.then(res => res.json())
			.then(data => {
			if (data.success) {
				alert(`✅ ${data.updated} variantes mises à jour.`);
				priceButton.textContent = "✅ Prix mis à jour";
				loadProducts(); // recharge la vue
			} else {
				alert("❌ " + (data.message || "Erreur API"));
				priceButton.textContent = "❌ Erreur";
			}
		})
			.catch(err => {
			alert("❌ Erreur réseau : " + err.message);
			priceButton.textContent = "❌ Erreur";
		})
			.finally(() => {
			priceButton.disabled = false;
			setTimeout(() => {
				priceButton.textContent = "🔁 Mettre à jour les prix d'achat";
			}, 3000);
		});
	});

	// 🔁 Référence au conteneur de tableau
	const tableContainer = document.getElementById("product-table");

	// ✅ Crée un wrapper pour regrouper les boutons côte à côte
	const btnWrapper = document.createElement("div");
	btnWrapper.style.display = "flex";
	btnWrapper.style.gap = "10px";
	btnWrapper.style.marginBottom = "10px";

	// Ajoute les deux boutons dans le wrapper
	btnWrapper.appendChild(stockButton);
	btnWrapper.appendChild(priceButton);

	// Insère le wrapper juste avant le tableau
	tableContainer.parentNode.insertBefore(btnWrapper, tableContainer);



	/* ——— nouveau HTML ——— */
	container.innerHTML = `
		<form id="create-by-id">
		  <input type="number"
				 id="printful-id"
				 placeholder="ID produit Printful"
				 required />
		  <button class="button button-primary" type="submit">
			Créer
		  </button>
		</form>
		<div id="product-form-msg"></div>
	  `;

	/* ——— action du bouton ——— */
	document.getElementById('create-by-id')
		.addEventListener('submit', e => {
		e.preventDefault();

		const id = parseInt(
			document.getElementById('printful-id').value
		);
		if (!id) { alert('ID manquant'); return; }

		const msg = document.getElementById('product-form-msg');
		msg.textContent = '⏳ Création en cours…';

		fetch(`/wp-json/api/v1/products/create/${id}`, { method: 'POST' })
			.then(r => r.json())
			.then(d => {
			if (d.success) {
				msg.textContent = `✅ Produit #${d.product_id} créé`;
				loadProducts();             
			} else {
				msg.textContent = '❌ ' + (d.message || 'Erreur');
			}
		})
			.catch(err => {
			msg.textContent = '⚠️ ' + err.message;
		});
	});
}


function loadProducts() {
	fetch('/wp-json/api/v1/products/list?include_inactive=1')
		.then(res => res.json())
		.then(products => {
		if (!Array.isArray(products)) {
			console.warn("Réponse inattendue :", products);
			return;
		}

		let html = `
		<table class="widefat fixed striped">
			<thead>
				<tr>
					<th>Nom</th>
					<th>Image</th>
					<th>Prix min</th>
					<th>Activé</th> <!-- ✅ Ajouté -->
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
	`;


		products.forEach(p => {
			html += `
						<tr>
							<td>${p.name}</td>
							<td><img src="${p.image}" width="50" height="50" style="object-fit:cover"/></td>
							<td>${p.lowest_price ? p.lowest_price.toFixed(2) + " €" : "--"}</td>
							<td>
	  <input type="checkbox" class="product-active-toggle"
			 data-id="${p.product_id}"
			 ${p.is_active ? 'checked' : ''}>
	</td>
							<td>
								<button class="button show-variants" data-id="${p.product_id}">🔽 Voir variantes</button>
							</td>
						</tr>
						<tr class="variants-row" id="variants-${p.product_id}" style="display: none;">
							<td colspan="4"><em>Chargement des variantes...</em></td>
						</tr>
					`;
		});

		html += "</tbody></table>";
		document.getElementById("product-table").innerHTML = html;
		document.querySelectorAll('.product-active-toggle').forEach(input => {
			input.addEventListener('change', () => {
				const productId = input.dataset.id;
				const newState = input.checked ? 1 : 0;

				fetch(`/wp-json/api/v1/products/${productId}/toggle`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ is_active: newState })
				})
					.then(res => res.json())
					.then(data => {
					if (!data.success) {
						alert("❌ Erreur lors de l’activation : " + (data.message || "Inconnue"));
						input.checked = !input.checked; // revert
					}
				})
					.catch(err => {
					alert("❌ Erreur réseau : " + err.message);
					input.checked = !input.checked;
				});
			});
		});
		// ✅ Dépliage des variantes
		document.querySelectorAll(".show-variants").forEach(btn => {
			btn.addEventListener("click", () => {
				const productId = btn.dataset.id;
				const row = document.getElementById(`variants-${productId}`);

				// Toggle d'affichage
				if (row.style.display === "none") {
					row.style.display = "table-row";

					// Chargement si pas encore fait
					if (!row.dataset.loaded) {
						fetch(`/wp-json/api/v1/products/${productId}/variants`)
							.then(res => res.json())
							.then(variants => {
							if (!Array.isArray(variants)) {
								row.innerHTML = `<td colspan="4"><p style="color:red;">Erreur de format API</p></td>`;
								return;
							}

							let content = `
								<h4>📦 Variantes de produit #${productId}</h4>
								<div style="margin-bottom:10px;">
		<label>💡 Marge globale : </label>
		<input type="number" id="margin-all-${productId}" step="1" min="0" max="500" style="width:60px" placeholder="%">
		<button class="button apply-margin-all" data-id="${productId}">Appliquer à toutes les variantes</button>
		<span class="margin-apply-status" id="margin-status-${productId}"></span>
	</div>

								<table style="width:100%; margin-top:10px; font-size: 13px;">
									<thead>
		<tr>
			<th>Image</th>
			<th>Couleur</th>
			<th>Taille</th>
			<th>Ratio</th>
			<th>Prix d'achat</th>
			<th>Prix de vente</th>
			<th>Marge (%)</th>
			<th>Bénéfice (€)</th>
			<th>Livraison (€)</th>
			<th>Prix public</th>
			<th>Stock</th>
		</tr>
	</thead>


									<tbody>
							`;

							variants.forEach(v => {
								const variantId = v.variant_id;

								// Affichage multi-région stock
								const stockDisplay = v.stock_by_region
								? Object.entries(v.stock_by_region).map(([region, status]) => {
									const emoji =
										  status === 'in stock' ? '🟢' :
									status === 'out of stock' ? '🔴' :
									status === 'discontinued' ? '⚫' : '❔';
									const color =
										  status === 'in stock' ? 'green' :
									status === 'out of stock' ? 'red' :
									status === 'discontinued' ? 'gray' : '#999';

									return `<span style="color:${color};">${emoji} ${region}</span>`;
								}).join('<br>')
								: '--';

								const variantPrice = parseFloat(v.price || 0);
								const deliveryPrice = parseFloat(v.delivery_price || 0);
								const salePrice = parseFloat(v.sale_price ?? 0);
								const marginPct = parseFloat(v.custom_margin ?? 30);
								const marginRatio = marginPct / 100;
								const publicPrice = (salePrice + deliveryPrice) *1.2;
								const profit = salePrice - variantPrice;




								content += `
	<tr>
		<td>
			${v.mockup?.image
									? `<img src="${v.mockup.image}" width="50" height="50" style="object-fit:cover"/>`
								: '--'}
		</td>
		<td>${v.color || '-'}</td>
		<td>${v.size || '-'}</td>
		<td>${v.ratio_image || '-'}</td>
		<td>${variantPrice.toFixed(2)} €</td>
		<td>${salePrice.toFixed(2)} €</td>
		<td>
			<input type="number" class="custom-margin" step="1" min="0"
				data-id="${variantId}"
				value="${!isNaN(marginPct) ? marginPct : ''}"
				placeholder="auto" style="width:60px"/>
		</td>
		<td>${profit.toFixed(2)} €</td>
		<td>${deliveryPrice.toFixed(2)} €</td>
		<td>${publicPrice.toFixed(2)} €</td>
		<td>${stockDisplay}</td>
	</tr>
	`;


							});

							content += "</tbody></table>";
							row.innerHTML = `<td colspan="5">${content}</td>`;
							row.dataset.loaded = "1";
							// ✅ Maintenant que les inputs sont dans le DOM
							row.querySelectorAll('.custom-margin').forEach(input => {
								input.addEventListener('change', () => {
									const variantId = input.dataset.id;
									const margin = input.value === '' ? null : parseFloat(input.value);

									const icon = document.createElement('span');
									icon.textContent = '✅';
									icon.style.marginLeft = '5px';
									icon.style.color = 'green';
									icon.style.fontSize = '14px';
									icon.style.opacity = '0.8';

									// Supprime icône précédente si présente
									input.nextElementSibling?.remove();

									// Envoi de la marge
									fetch(`/wp-json/api/v1/products/variant/${variantId}/margin`, {
										method: 'POST',
										headers: { 'Content-Type': 'application/json' },
										body: JSON.stringify({ custom_margin: margin })
									}).then(res => res.json())
										.then(data => {
										if (data.success) {
											input.after(icon);
											setTimeout(() => icon.remove(), 2000);
										} else {
											const errIcon = document.createElement('span');
											errIcon.textContent = '❌';
											errIcon.style.marginLeft = '5px';
											errIcon.style.color = 'red';
											input.after(errIcon);
											setTimeout(() => errIcon.remove(), 4000);
										}
									});

								});
							});
							const applyBtn = row.querySelector(`.apply-margin-all[data-id="${productId}"]`);
							if (applyBtn) {
								applyBtn.addEventListener('click', () => {
									const input = row.querySelector(`#margin-all-${productId}`);
									const status = row.querySelector(`#margin-status-${productId}`);
									const margin = parseFloat(input.value);

									if (isNaN(margin) || margin < 0 || margin > 500) {
										status.textContent = '❌ Marge invalide';
										status.style.color = 'red';
										return;
									}

									status.textContent = '⏳';
									status.style.color = 'gray';

									fetch(`/wp-json/api/v1/products/${productId}/margin`, {
										method: 'POST',
										headers: { 'Content-Type': 'application/json' },
										body: JSON.stringify({ custom_margin: margin })
									})
										.then(res => res.json())
										.then(data => {
										if (data.success) {
											status.textContent = '✅';
											status.style.color = 'green';
											// Optionnel : recharger les variantes ?
											loadProducts(); // ou juste re-déclencher le click sur show-variants
										} else {
											status.textContent = '❌ ' + (data.message || 'Erreur');
											status.style.color = 'red';
										}
									})
										.catch(err => {
										status.textContent = '❌ Réseau';
										status.style.color = 'red';
									});
								});
							}


						})
							.catch(err => {
							console.error("❌ Erreur chargement variantes :", err);
							row.innerHTML = `<td colspan="4"><p style="color:red;">Erreur chargement des variantes.</p></td>`;
						});
					}
				} else {
					row.style.display = "none";
				}
			});
		});

	})
		.catch(error => {
		console.error("❌ Erreur lors de la récupération des produits :", error);
		document.getElementById("product-table").innerHTML = "<p style='color:red;'>Erreur de chargement.</p>";
	});
}
