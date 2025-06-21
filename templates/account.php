<?php
/*
Template Name: Account
*/
get_header();
?>

<main id="site-content" class="site-content">
    <div id="profile" class="profile">
        <?php get_template_part('templates/profile/sidebar'); ?>
        <div id="main-container" class="main-container">
        </div>
    </div>
    <script>
        var ajaxurl = '<?php echo esc_js(admin_url('admin-ajax.php')); ?>';
    </script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/cropperjs@1.5.12/dist/cropper.min.js"></script>

    <script src="/wp-content/themes/customiizer/js/account/sidebar.js"></script>
    <script src="/wp-content/themes/customiizer/js/account/dashboard.js"></script>
    <script src="/wp-content/themes/customiizer/js/account/purchases.js"></script>
    <script src="/wp-content/themes/customiizer/js/account/profile.js"></script>
</main>

<?php
get_footer();
?>
