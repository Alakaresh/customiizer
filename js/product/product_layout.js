jQuery(document).ready(function ($) {
    const container = document.querySelector('.container');
    const header = document.getElementById('header');
    if (!container || !header) return;

    function setContainerHeight() {
        const headerHeight = header.offsetHeight;
        const viewportHeight = window.innerHeight;
        container.style.height = (viewportHeight - headerHeight) + 'px';
    }

    // initial adjustment after header is rendered
    setContainerHeight();

    // observe header size changes
    if (window.ResizeObserver) {
        const observer = new ResizeObserver(setContainerHeight);
        observer.observe(header);
    }

    window.addEventListener('resize', setContainerHeight);
});
