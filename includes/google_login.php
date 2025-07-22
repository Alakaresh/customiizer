<?php
function customiizer_google_login(){
    if(empty($_POST['id_token'])){
        wp_send_json_error(['message'=>'Missing ID token']);
    }
    $id_token = sanitize_text_field($_POST['id_token']);
    $verify_url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($id_token);
    $response = wp_remote_get($verify_url, ['timeout'=>15]);
    if(is_wp_error($response)){
        wp_send_json_error(['message'=>'Google verification failed']);
    }
    $data = json_decode(wp_remote_retrieve_body($response), true);
    if(empty($data['email'])){
        wp_send_json_error(['message'=>'Invalid token']);
    }
    $email = sanitize_email($data['email']);
    $name  = isset($data['name']) ? sanitize_text_field($data['name']) : '';
    $user = get_user_by('email', $email);
    if(!$user){
        $username_base = isset($data['given_name']) ? sanitize_user($data['given_name'], true) : 'googleuser';
        $username = $username_base . '_' . wp_generate_password(4, false);
        $password = wp_generate_password();
        $user_id = wp_create_user($username, $password, $email);
        if(is_wp_error($user_id)){
            wp_send_json_error(['message'=>'User creation failed']);
        }
        if($name){
            wp_update_user(['ID'=>$user_id,'display_name'=>$name]);
        }
        global $wpdb;
        $wpdb->insert('WPC_users',['user_id'=>$user_id,'image_credits'=>30],['%d','%d']);
        $user = get_user_by('ID', $user_id);
    }
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID);
    wp_send_json_success(['message'=>'Login successful']);
}
add_action('wp_ajax_nopriv_google_login','customiizer_google_login');
