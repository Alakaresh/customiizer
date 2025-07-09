jQuery(document).ready(function($) {
	var visibleItems = 5; // Nombre d'éléments visibles dans le carrousel
	var itemWidth; // Initialisation de la variable pour la largeur des éléments

	var products = [
		{
			image: baseUrl + '/wp-content/themes/customiizer/images/products/2_visuel/19/Spring_summer_vibes_Handle_on_Left.png',
			name: 'Mug'
		},
		{
			image: baseUrl + '/wp-content/themes/customiizer/images/products/2_visuel/518/Lifestyle_Front.png',
			name: 'Tapis de souris'
		},
		{
			image: baseUrl + '/wp-content/themes/customiizer/images/products/2_visuel/585/Lifestyle_2_Back.png',
			name: 'Gobelet inox'
		},
		{
			image: baseUrl + '/wp-content/themes/customiizer/images/products/2_visuel/181/Default_Case_with_phone.png',
			name: 'Coque IPhone'
		},
		{
			image: baseUrl + '/wp-content/themes/customiizer/images/products/2_visuel/267/Default_Case_with_phone.png',
			name: 'Coque Samsung'
		},
		{
			image: baseUrl + '/wp-content/themes/customiizer/images/products/2_visuel/366/Lifestyle_4_Front.png',
			name: 'Tableau encadré'
		},
		{
			image: baseUrl + '/wp-content/themes/customiizer/images/products/2_visuel/1/Lifestyle_Lifestyle_1.png',
			name: 'Affiche papier mat'
		},
		{
			image: baseUrl + '/wp-content/themes/customiizer/images/products/2_visuel/382/Lifestyle_4_Front_2.png',
			name: 'Gourde inox'
		},
		{
			image: baseUrl + '/wp-content/themes/customiizer/images/products/2_visuel/583/1f78a867c0cc98acf7848dfcca9d9a67_l.webp',
			name: 'Tapis de souris gaming'
		}
	];

	var $carousel = jQuery('<div class="carousel-inner"></div>');

	products.forEach(function(product) {
		const formattedName = product.name.toLowerCase()
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		.replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

		const idMatch = product.image.match(/\/(\d+)\//);
		const productId = idMatch ? idMatch[1] : '1';

		const link = `${baseUrl}/configurateur?nom=${formattedName}&id=${productId}`;

		const $item = jQuery(`
		<div class="product-item">
			<a href="${link}" class="product-image-link" style="background-image:url('${product.image}');"></a>
			<a href="${link}" class="product-name-link">
				<div class="product-name">${product.name}</div>
			</a>
		</div>
	`);

		$carousel.append($item);
	});

	jQuery('.carousel-items').append($carousel);


       function initCarousel() {
               var mq = window.matchMedia('(max-width: 1024px)');
               visibleItems = mq.matches ? 2 : 5;

               var containerWidth = jQuery('.carousel-inner').width();
               itemWidth = containerWidth / visibleItems - (10 * 2);
		jQuery('.product-item').css('width', itemWidth + 'px');


		jQuery('.product-item').css('width', itemWidth + 'px'); // Appliquer la largeur calculée à chaque élément
	}

	function rotateCarousel(direction) {
		var $items = jQuery('.carousel-inner .product-item');
		if (direction === 'prev') {
			var $first = $items.first();
			$first.detach();
			jQuery('.carousel-inner').append($first);
		} else {
			var $last = $items.last();
			$last.detach();
			jQuery('.carousel-inner').prepend($last);
		}
		jQuery('.carousel-inner').css('left', '0px'); // Réinitialiser la position
	}

	jQuery('#productCarousel .carousel-control-next').click(function() {
		rotateCarousel('next');
	});

	jQuery('#productCarousel .carousel-control-prev').click(function() {
		rotateCarousel('prev');
	});

	// Initialisation et gestion du redimensionnement pour recalculer les largeurs
	initCarousel();
	jQuery(window).resize(function() {
		initCarousel();
	});
});
