(function (root, factory) {
  var controller = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = controller;
  }

  root.ESBvaktinTrackerController = controller;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var utils = (typeof globalThis !== "undefined" && globalThis.ESBvaktinTrackerUtils) || {};
  var debounce = utils.debounce || function (fn) {
    return fn;
  };

  function create(config) {
    var root = config.root;
    var state = Object.assign({}, config.initialState);
    var data = config.initialData;

    function getState() {
      return state;
    }

    function getData() {
      return data;
    }

    function normalizeOptions(options, defaultRender) {
      if (options == null) {
        return { render: defaultRender };
      }

      if (
        typeof options === "string" ||
        typeof options === "function" ||
        Array.isArray(options) ||
        options === false
      ) {
        return { render: options };
      }

      return options;
    }

    function captureFocus(selector) {
      if (!selector || typeof document === "undefined") return null;

      var active = document.activeElement;
      if (!active || !root.contains(active) || !active.matches(selector)) {
        return null;
      }

      return {
        selector: selector,
        selectionStart: typeof active.selectionStart === "number" ? active.selectionStart : null,
        selectionEnd: typeof active.selectionEnd === "number" ? active.selectionEnd : null,
      };
    }

    function restoreFocus(focusState) {
      if (!focusState) return;

      var next = root.querySelector(focusState.selector);
      if (!next) return;

      next.focus();
      if (
        focusState.selectionStart != null &&
        focusState.selectionEnd != null &&
        typeof next.setSelectionRange === "function"
      ) {
        next.setSelectionRange(focusState.selectionStart, focusState.selectionEnd);
      }
    }

    function renderByScope(scope) {
      if (scope === false) return;

      if (typeof scope === "function") {
        scope(api);
        return;
      }

      if (Array.isArray(scope)) {
        scope.forEach(renderByScope);
        return;
      }

      switch (scope || "results") {
        case "all":
          if (config.renderShell) config.renderShell(api);
          if (config.renderStats) config.renderStats(api);
          if (config.renderResults) config.renderResults(api);
          break;
        case "shell":
          if (config.renderShell) config.renderShell(api);
          break;
        case "stats":
          if (config.renderStats) config.renderStats(api);
          break;
        case "stats+results":
          if (config.renderStats) config.renderStats(api);
          if (config.renderResults) config.renderResults(api);
          break;
        case "results":
        default:
          if (config.renderResults) config.renderResults(api);
      }
    }

    function rerender(options) {
      var renderOptions = normalizeOptions(options, config.defaultRender || "results");
      var focusState = captureFocus(renderOptions.focusSelector);

      renderByScope(renderOptions.render);
      restoreFocus(focusState);
    }

    function setState(nextState, options) {
      var patch = typeof nextState === "function" ? nextState(Object.assign({}, state), api) : nextState;
      var prev = state;
      state = Object.assign({}, state, patch || {});
      rerender(options);

      // Analytics: track filter changes
      if (typeof window.ESBvaktinAnalytics !== "undefined" && config.trackerName) {
        var changed = patch || {};
        Object.keys(changed).forEach(function (key) {
          if (prev[key] !== state[key] && state[key] !== "" && state[key] != null) {
            window.ESBvaktinAnalytics.track(
              "filter/" + config.trackerName,
              key + "=" + state[key]
            );
          }
        });
      }

      return state;
    }

    function setData(nextData, options) {
      data = typeof nextData === "function" ? nextData(data, api) : nextData;
      rerender(options);
      return data;
    }

    async function loadJson(url) {
      var response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch " + url + ": " + response.status);
      }
      return response.json();
    }

    function delegate(eventName, selector, handler) {
      root.addEventListener(eventName, function (event) {
        if (!event.target || typeof event.target.closest !== "function") return;

        var target = event.target.closest(selector);
        if (!target || !root.contains(target)) return;

        handler(target, event, api);
      });
    }

    function bindInput(selector, handler, options) {
      var bindOptions = options || {};
      var wrapped = function (target, event, controller) {
        var value = target.value;
        if (bindOptions.trim) {
          value = value.trim();
        }
        handler(value, target, event, controller);
      };

      if (bindOptions.debounceMs) {
        var debounced = debounce(function (target, event, controller) {
          wrapped(target, event, controller);
        }, bindOptions.debounceMs);

        delegate("input", selector, function (target, event, controller) {
          debounced(target, event, controller);
        });
        return;
      }

      delegate("input", selector, wrapped);
    }

    function bindChange(selector, handler) {
      delegate("change", selector, function (target, event, controller) {
        handler(target.value, target, event, controller);
      });
    }

    function bindClick(selector, handler) {
      delegate("click", selector, handler);
    }

    function bindKeyActivate(selector, handler) {
      delegate("keydown", selector, function (target, event, controller) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handler(target, event, controller);
      });
    }

    async function start() {
      if (config.renderShell) {
        config.renderShell(api);
      }

      try {
        if (config.load) {
          var nextData = await config.load(api);
          if (nextData !== undefined) {
            data = nextData;
          }
        }

        if (config.afterLoad) {
          await config.afterLoad(api);
        }

        rerender(config.initialRender || "all");
      } catch (error) {
        if (config.onError) {
          config.onError(error, api);
          return;
        }
        throw error;
      }
    }

    var api = {
      bindChange: bindChange,
      bindClick: bindClick,
      bindInput: bindInput,
      bindKeyActivate: bindKeyActivate,
      delegate: delegate,
      getData: getData,
      getRoot: function () {
        return root;
      },
      getState: getState,
      loadJson: loadJson,
      rerender: rerender,
      setData: setData,
      setState: setState,
      start: start,
    };

    return api;
  }

  return {
    create: create,
  };
});
