<?php
/*
Template Name: Contact
*/
get_header();
?>

<main id="site-content" class="site-content">
	<section class="contact-section">
		<h2>Une question ?</h2>
		<p>Nous sommes là pour vous aider. Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.</p>


		<!-- Shortcode for Contact Form 7 -->
		<div class="contact-form">
			<?php echo do_shortcode('[contact-form-7 id="b4c0fb8" title="Contact form 1"]'); ?>
		</div>
	</section>
</main>

<?php
get_footer();
?>
