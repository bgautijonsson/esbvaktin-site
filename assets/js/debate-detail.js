// Clicking the expanded speech body collapses the parent <details>.
for (const el of document.querySelectorAll('.dd-speech-full')) {
  el.addEventListener('click', () => el.closest('details').removeAttribute('open'));
}
