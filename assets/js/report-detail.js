// "Opna allar"/"Loka öllum" toggle for the claim list on a report page.
(function () {
  const btn = document.querySelector('.report-toggle-all');
  if (!btn) return;
  const claims = document.querySelectorAll('details.report-claim');

  btn.addEventListener('click', function () {
    const expanding = btn.dataset.action === 'expand';
    claims.forEach(function (d) { d.open = expanding; });
    btn.dataset.action = expanding ? 'collapse' : 'expand';
    btn.textContent = expanding ? 'Loka öllum' : 'Opna allar';
  });
})();
