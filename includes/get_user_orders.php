<?php
add_action('wp_ajax_get_user_orders', 'get_user_orders');
add_action('wp_ajax_nopriv_get_user_orders', 'get_user_orders'); // pour les utilisateurs non connectés

function get_user_orders() {
	if (!is_user_logged_in()) {
		wp_send_json_error('Utilisateur non connecté');
		return;
	}

	$user_id = get_current_user_id();
	$per_page = isset($_POST['per_page']) ? intval($_POST['per_page']) : 10;
	$page = isset($_POST['page']) ? intval($_POST['page']) : 1;

	$orders = wc_get_orders([
		'customer' => $user_id,
		'limit' => $per_page,
		'page' => $page,
		'paginate' => true,
	]);

	$orders_data = array_map(function($order) {
		// Formatage de la date de création
		$date_created = $order->get_date_created() ? $order->get_date_created()->date('d/m/Y') : '';

		// Exemple pour récupérer les données de suivi, cela dépend de votre système de suivi
		$tracking_info = $order->get_meta('_printful_tracking_url'); // Assurez-vous que '_tracking_info' est la clé correcte

		$items_count = count($order->get_items());

		return [
			'id' => $order->get_id(),
			'number' => $order->get_order_number(),
			'status' => wc_get_order_status_name($order->get_status()),
			'total' => $order->get_total(),
			'creation_date' => $date_created,
			'tracking_info' => $tracking_info, // Ajout des informations de suivi
			'items_count' => $items_count,
			'invoice_url' => home_url('/?action=generate_invoice&order_id=' . $order->get_id() . '&order_key=' . $order->get_order_key() . '&output=download'),

		];
	}, $orders->orders);

	wp_send_json_success(['orders' => $orders_data, 'total' => $orders->total, 'max_num_pages' => $orders->max_num_pages]);
}

add_action('wp_ajax_get_order_details', 'get_order_details_ajax');
add_action('wp_ajax_nopriv_get_order_details', 'get_order_details_ajax');

function get_order_details_ajax() {
	$order_id = isset($_GET['orderId']) ? intval($_GET['orderId']) : 0;
	$order = wc_get_order($order_id);

	if (!$order) {
		wp_send_json_error('Commande non trouvée');
		wp_die();
	}

	$items_data = array();
	foreach ($order->get_items() as $item_id => $item) {
		$product = $item->get_product();
		$image_id = $product->get_image_id();
		$image_url = wp_get_attachment_image_url($image_id, 'full');

		$items_data[] = array(
			'name' => $item->get_name(),
			'image_url' => $image_url,
			'quantity' => $item->get_quantity(),
			'total' => wc_price($item->get_total()),
		);
	}

	$order_data = array(
		'id' => $order->get_id(),
		'number' => $order->get_order_number(),
		'items' => $items_data,
		'subtotal' => wc_price($order->get_subtotal()),
		'discount' => wc_price($order->get_total_discount()),
		'shipping' => wc_price($order->get_shipping_total()),
		'tax' => wc_price($order->get_total_tax()),
		'total' => wc_price($order->get_total())
	);



	wp_send_json_success($order_data);
}

