<!--
<div id="introScreen" class="intro" style="display:none">
	<div class="intro-content">
		<h1>Welcome to our image generator!</h1>
		<p>Click "Start Tutorial" to begin the tutorial or "Close" to start generating your first image without delay.</p>
		<button id="startTutorial">Start Tutorial</button>
		<button id="closeIntro">Close</button>
	</div>
</div>
-->

<div id="generation-progress-modal" class="generation-progress-modal hide" role="dialog" aria-modal="true" aria-labelledby="generation-progress-title" aria-describedby="loading-text" aria-hidden="true">
        <div class="generation-progress-dialog" role="document">
                <h2 id="generation-progress-title" class="generation-progress-title">Génération en cours</h2>
                <div class="loading-container">
                        <div class="loading-bar-border" role="presentation">
                                <div class="loading-bar" id="loading-bar"></div>
                        </div>
                        <div class="loading-text" id="loading-text" aria-live="polite">Chargement... Veuillez patienter !</div>
                </div>
        </div>
</div>

<div class="content-images" id="content-images">
        <div id="image-grid" class="image-grid">
                <img class="main-image top" src="/wp-content/themes/customiizer/images/customiizerSiteImages/attente.png" alt="Image 0">
                <img class="main-image top" src="/wp-content/themes/customiizer/images/customiizerSiteImages/attente.png" alt="Image 1">
		<img class="main-image bottom" src="/wp-content/themes/customiizer/images/customiizerSiteImages/attente.png" alt="Image 2">
		<img class="main-image bottom" src="/wp-content/themes/customiizer/images/customiizerSiteImages/attente.png" alt="Image 3">
	</div>
</div>