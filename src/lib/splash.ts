/** Fade out and remove the static splash screen defined in index.html. */
export function hideSplash() {
  const splash = document.getElementById('global-splash');
  if (!splash || splash.dataset.hiding) return;
  splash.dataset.hiding = '1';
  splash.style.opacity = '0';
  window.setTimeout(() => splash.remove(), 700);
}
