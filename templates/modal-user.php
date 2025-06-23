<head>
	<meta charset="utf-8">
       <!-- Style moved to assets.php -->
</head>

<div id="userModal" class="userModal" style="display:none;">
	<div class="modal-content">
		<!-- Section du titre avec uniquement le nom d'utilisateur -->
		<div class="user-info">
			<div class="user-name" style="text-align: center; background-color: #222; padding: 10px;">
				<?php 
				$current_user = wp_get_current_user();
				echo esc_html($current_user->display_name); 
				?>
			</div>
		</div>

		<!-- Conteneur pour la partie basse -->
		<div class="lower-container">
			<!-- Liens vers d'autres sections -->
			<button class="modal-button" onclick="location.href='<?php echo home_url('/compte'); ?>'">
				<i class="fas fa-id-badge"></i> Mon compte
			</button>
			<button class="modal-button" onclick="location.href='<?php echo home_url('/communaute'); ?>'">
				<i class="fas fa-users"></i> Communauté
			</button>
			<a href="/compte?triggerClick=true" id="myCreationsLinkModal" class="modal-button" style="color: white;">
				<i class="fas fa-images"></i> Mes créations
			</a>





			<button class="modal-button" style="background-color: #d14343; text-align: center;" onclick="location.href='<?php echo wp_logout_url(home_url('/home')); ?>'">
				<i class="fas fa-sign-out-alt"></i> Déconnexion
			</button>
		</div>
	</div>
</div>

<!-- Script moved to assets.php -->
