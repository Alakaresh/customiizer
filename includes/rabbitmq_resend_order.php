<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly
}

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

if ( is_admin() ) {
    add_filter( 'woocommerce_order_actions', 'customiizer_add_rabbitmq_order_action' );
    add_action( 'woocommerce_order_action_customiizer_resend_to_rabbitmq', 'customiizer_resend_order_to_rabbitmq' );
}

function customiizer_add_rabbitmq_order_action( $actions ) {
    $actions['customiizer_resend_to_rabbitmq'] = __('Renvoyer vers RabbitMQ', 'customiizer');
    return $actions;
}

function customiizer_resend_order_to_rabbitmq( $order ) {
    if ( ! $order instanceof WC_Order ) {
        return;
    }

    $data = customiizer_build_rabbitmq_payload( $order );

    try {
        $connection = new AMQPStreamConnection( RABBIT_HOST, RABBIT_PORT, RABBIT_USER, RABBIT_PASS );
        $channel    = $connection->channel();
        $channel->queue_declare( QUEUE_NAME, false, true, false, false );

        $msg = new AMQPMessage( wp_json_encode( $data ), [
            'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT,
        ] );
        $channel->basic_publish( $msg, '', QUEUE_NAME );

        $order->add_order_note( __( 'Commande renvoyée dans RabbitMQ', 'customiizer' ) );

        $channel->close();
        $connection->close();
    } catch ( \Throwable $e ) {
        $order->add_order_note( 'RabbitMQ error: ' . $e->getMessage() );
    }
}

function customiizer_build_rabbitmq_payload( WC_Order $order ) {
    $items = [];
    foreach ( $order->get_items() as $item ) {
        $items[] = [
            'product_id' => $item->get_product_id(),
            'name'       => $item->get_name(),
            'quantity'   => $item->get_quantity(),
        ];
    }

    $billing = [
        'first_name' => $order->get_billing_first_name(),
        'last_name'  => $order->get_billing_last_name(),
        'address_1'  => $order->get_billing_address_1(),
        'city'       => $order->get_billing_city(),
        'postcode'   => $order->get_billing_postcode(),
        'country'    => $order->get_billing_country(),
        'phone'      => $order->get_billing_phone(),
        'email'      => $order->get_billing_email(),
    ];

    return [
        'id'         => $order->get_id(),
        'number'     => $order->get_order_number(),
        'status'     => $order->get_status(),
        'line_items' => $items,
        'billing'    => $billing,
    ];
}
