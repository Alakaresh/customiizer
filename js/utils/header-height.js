function updateHeaderHeight() {
    const header = document.getElementById('header');
    if (!header) return;
    const root = document.documentElement;
    root.style.setProperty('--header-height', header.offsetHeight + 'px');
}

document.addEventListener('DOMContentLoaded', () => {
    updateHeaderHeight();
    const header = document.getElementById('header');
    if (!header || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(header);
});
