<!-- sidebar.php -->
<div class="sidebar">
	<div class="sidebar-container">
		<div id="profileContainer" class="profile-picture" onclick="showElement('modalChoixImage');">
			<div class="circle-plus" id="circlePlus">
				<div class="plus-vertical"></div>
				<div class="plus-horizontal"></div>
			</div>
			<img id="profileImage" src="" alt="Photo de profil" style="display: none;" />
		</div>

		<div class="user-info">
			<p><span id="nickname"></span></p>
		</div>


		<nav class="navigation-menu">
			<a href="javascript:void(0);" id="dashboardLink" class="ajax-link" data-target="dashboard">Tableau de bord</a>
			<a href="javascript:void(0);" id="picturesLink" class="ajax-link" data-target="pictures">Images</a>
			<a href="javascript:void(0);" id="accountLink" class="ajax-link" data-target="profile">Profil</a>
                       <a href="javascript:void(0);" id="purchasesLink" class="ajax-link" data-target="purchases">Commandes</a>
                       <a href="javascript:void(0);" id="loyaltyLink" class="ajax-link" data-target="loyalty">Mes avantages</a>
               </nav>

		<a href="/logout" class="logout-button" style="text-align: center;">Déconnexion</a>
	</div>

	<!-- MODAL CHOIX IMAGE -->
	<div id="modalChoixImage" class="modal" style="display: none;">
		<div class="modal-header">
			<span class="close-btn" onclick="hideElement('modalChoixImage');">&#215;</span>
			<h2>Choisir une image</h2>
		</div>
		<div class="modal-body">
			<div id="imagePreview" class="image-placeholder">
				<img id="imageToCrop" style="display:none;">
			</div>
		</div>
		<div class="modal-footer">
			<div class="top-buttons">
				<button onclick="document.getElementById('fileInput').click();">Ordinateur</button>
				<input type="file" id="fileInput" accept="image/*" style="display: none;" onchange="handleImageUpload(event)">
				<button onclick="afficherGalerie();">Mes créations</button>
			</div>
			<div class="bottom-button">
				<button onclick="applyCrop();">Appliquer</button>
			</div>
		</div>
	</div>
</div>

<script>
	var baseTemplateUrl = "<?php echo get_stylesheet_directory_uri(); ?>/templates/profile/";
</script>
