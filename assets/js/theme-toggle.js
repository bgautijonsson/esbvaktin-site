(function () {
  var STORAGE_KEY = "esb-theme";
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;

  var MODES = ["system", "light", "dark"];
  var ICONS = { system: "\u25D0", light: "\u2600", dark: "\u263E" };
  var LABELS = { system: "Sj\u00e1lfvirkt", light: "Lj\u00f3st", dark: "D\u00f6kkt" };

  function getStored() {
    return localStorage.getItem(STORAGE_KEY) || "system";
  }

  function apply(mode) {
    var html = document.documentElement;
    if (mode === "system") {
      html.removeAttribute("data-theme");
    } else {
      html.setAttribute("data-theme", mode);
    }
    btn.textContent = ICONS[mode];
    btn.setAttribute("aria-label", LABELS[mode]);
    btn.setAttribute("title", LABELS[mode]);
  }

  function cycle() {
    var current = getStored();
    var next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  }

  apply(getStored());
  btn.addEventListener("click", cycle);
})();
