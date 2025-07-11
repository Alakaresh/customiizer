<?php
// Direct access via AJAX needs WordPress functions.
if ( ! defined( 'ABSPATH' ) ) {
    $wp_load = __DIR__ . '/../../../../../wp-load.php';
    if ( file_exists( $wp_load ) ) {
        require_once $wp_load;
    }
}
?>
<!-- TABLEAU DE BORD -->
<div class="dashboard-container" id="dashboard-container">
	<div class="content-container" id="dashboard-container1">
		<h2>Profil</h2>
		<div class="centered-content">
			<div class="progress-container">
				<div class="progress-ring" id="progressRing">
					<div class="percentage" id="percentage">0%</div>
				</div>
			</div>
			<button id="viewProfileButton" class="content-button">Mettre à jour</button>
		</div>
	</div>

	<div class="content-container" id="dashboard-container2">
		<h2>Images</h2>
		<div class="centered-content">
			<img src="/wp-content/themes/customiizer/images/customiizerSiteImages/picture_logo.webp" alt="Logo images" style="height: 120px; border-radius: 10px;">
			<button id="viewImagesButton" class="content-button">Explorer</button>
		</div>
	</div>

        <div class="content-container" id="dashboard-container3">
                <h2>Mes achats</h2>
                <div class="centered-content">
                        <img src="/wp-content/themes/customiizer/images/customiizerSiteImages/purchase_logo.webp" alt="Logo achats" style="height: 120px; border-radius: 10px;">
                        <button id="viewPurchasesButton" class="content-button">Mes achats</button>
                </div>
        </div>
       <div class="content-container" id="dashboard-container4">
               <h2>Mes avantages</h2>
               <div class="centered-content">
                       <img src="/wp-content/themes/customiizer/images/customiizerSiteImages/customPoint.png" alt="Logo Custompoints" style="height: 120px; border-radius: 10px;">
                       <button id="viewLoyaltyButton" class="content-button">En savoir plus</button>

                             
               </div>
       </div>
</div>

<script>
	$(document).ready(function() {
		// Déclencheurs pour les boutons qui simulent les clics sur les liens
                $('#viewProfileButton').click(() => $('#accountLink').trigger('click'));
                $('#viewImagesButton').click(() => $('#picturesLink').trigger('click'));
               $('#viewPurchasesButton').click(() => $('#purchasesLink').trigger('click'));
               $('#viewLoyaltyButton').click(() => $('#loyaltyLink').trigger('click'));
       });
</script>
