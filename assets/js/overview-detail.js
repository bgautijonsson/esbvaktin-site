// Expandable cards + editorial collapse for the weekly-overview detail page.
(function () {
  function bindExpandable(containerSel, cardSel, headerSel, expandedClass) {
    var cards = document.querySelectorAll(containerSel + ' ' + cardSel);
    cards.forEach(function (card) {
      var header = card.querySelector(headerSel);
      if (!header) return;
      function toggle() {
        var expanded = !card.classList.contains(expandedClass);
        card.classList.toggle(expandedClass, expanded);
        header.setAttribute('aria-expanded', expanded);
      }
      header.addEventListener('click', toggle);
      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }
  bindExpandable('.od-top-claims', '.ct-card', '.ct-card-header', 'ct-expanded');
  bindExpandable('.od-key-facts', '.od-fact-card', '.od-fact-header', 'od-fact-expanded');

  // Editorial collapse — show first 2 <p> then hide the rest behind a "read more" toggle.
  var editorial = document.querySelector('.od-editorial');
  if (!editorial) return;
  var children = Array.from(editorial.children);
  var pCount = 0;
  var hideFrom = -1;
  for (var i = 0; i < children.length; i++) {
    if (children[i].tagName === 'P' && !children[i].classList.contains('od-ai-disclosure')) {
      pCount++;
      if (pCount === 3 && hideFrom === -1) { hideFrom = i; }
    }
  }
  if (hideFrom <= 0) return;

  var moreDiv = document.createElement('div');
  moreDiv.className = 'od-editorial-more';
  for (var j = children.length - 1; j >= hideFrom; j--) {
    moreDiv.insertBefore(children[j], moreDiv.firstChild);
  }
  editorial.appendChild(moreDiv);

  var btn = document.createElement('button');
  btn.className = 'od-editorial-toggle';
  btn.textContent = 'Lesa allt yfirlitið ▸';
  btn.setAttribute('aria-expanded', 'false');
  editorial.insertBefore(btn, moreDiv);

  btn.addEventListener('click', function () {
    var expanded = editorial.classList.toggle('od-editorial-expanded');
    btn.setAttribute('aria-expanded', expanded);
    btn.textContent = expanded ? 'Minna ▾' : 'Lesa allt yfirlitið ▸';
  });
})();
