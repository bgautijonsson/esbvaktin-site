// Removes the classless tooltip <div> that the Buy Me a Coffee widget appends to <body>.
// The vendor markup has no class/id so we identify it by its inline styles (position:fixed, max-width).
new MutationObserver((_, obs) => {
  const btn = document.getElementById('bmc-wbtn');
  if (!btn) return;
  for (const el of document.body.children) {
    if (el.tagName === 'DIV' && !el.id && !el.className && el !== btn && el.style.position === 'fixed' && el.style.maxWidth) {
      el.remove();
      obs.disconnect();
      return;
    }
  }
}).observe(document.body, { childList: true });
