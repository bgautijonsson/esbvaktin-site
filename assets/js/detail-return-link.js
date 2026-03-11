(function () {
  "use strict";

  var utils = globalThis.ESBvaktinTrackerUtils || {};

  if (typeof utils.bindReturnLinks !== "function") return;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      utils.bindReturnLinks(document);
    });
    return;
  }

  utils.bindReturnLinks(document);
})();
