// Replaces inline onclick/onload attributes to support a strict CSP without 'unsafe-inline'.

// "Styrkja" buttons (header + homepage hero) open the Buy Me a Coffee widget popup.
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-action="open-bmac"]');
  if (!trigger) return;
  document.querySelector('#bmc-wbtn')?.click();
});

// Deferred Google Fonts loaded with media="print" — flip to media="all" once they load.
// (Async loading without blocking render. Was previously done with inline onload.)
for (const link of document.querySelectorAll('link[data-font-deferred]')) {
  if (link.sheet) {
    link.media = 'all';
  } else {
    link.addEventListener('load', () => { link.media = 'all'; });
  }
}
