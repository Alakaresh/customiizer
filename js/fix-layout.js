function fixProductLayoutHeight() {
  const header = document.getElementById('header');
  const container = document.querySelector('.container');
  const wpBar = document.getElementById('wpadminbar');
  if (!header || !container) return;

  // Hauteur réelle disponible à l'écran
  const vh = window.innerHeight;
  const headerHeight = header.offsetHeight || 65; // fallback au cas où
  const wpBarHeight = wpBar?.offsetHeight || 0;

  const height = vh - headerHeight - wpBarHeight;

  container.style.height = `${height}px`;
  container.style.overflow = 'hidden';

  console.log(`[LayoutFix] height=${height}px (vh=${vh}px - header=${headerHeight}px - wpbar=${wpBarHeight}px)`);
}

window.addEventListener('load', fixProductLayoutHeight);
window.addEventListener('resize', fixProductLayoutHeight);
