(function () {
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.querySelector(".site-menu");
  if (!toggle || !menu) return;

  var mobileQuery = window.matchMedia("(max-width: 960px)");
  var firstLink = menu.querySelector("a");

  function setToggleState(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Loka valmynd" : "Opna valmynd");
    toggle.setAttribute("title", open ? "Loka valmynd" : "Opna valmynd");
  }

  function syncMenuVisibility(open) {
    menu.hidden = mobileQuery.matches ? !open : false;
  }

  function closeMenu(options) {
    var restoreFocus = options && options.restoreFocus;
    menu.classList.remove("is-open");
    setToggleState(false);
    syncMenuVisibility(false);

    if (restoreFocus) {
      toggle.focus();
    }
  }

  function openMenu() {
    syncMenuVisibility(true);
    menu.classList.add("is-open");
    setToggleState(true);

    if (mobileQuery.matches && firstLink) {
      firstLink.focus();
    }
  }

  function syncLayout() {
    if (mobileQuery.matches) {
      syncMenuVisibility(menu.classList.contains("is-open"));
      return;
    }

    menu.classList.remove("is-open");
    setToggleState(false);
    syncMenuVisibility(true);
  }

  setToggleState(false);
  syncLayout();

  toggle.addEventListener("click", function () {
    var open = menu.classList.contains("is-open");
    if (open) {
      closeMenu({ restoreFocus: true });
    } else {
      openMenu();
    }
  });

  document.addEventListener("click", function (e) {
    if (menu.classList.contains("is-open") && !toggle.contains(e.target) && !menu.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu.classList.contains("is-open")) {
      closeMenu({ restoreFocus: true });
    }
  });

  menu.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      closeMenu();
    });
  });

  mobileQuery.addEventListener("change", function () {
    syncLayout();
  });
})();
