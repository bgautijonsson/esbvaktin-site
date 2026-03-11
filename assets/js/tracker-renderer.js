(function (root, factory) {
  var renderer = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = renderer;
  }

  root.ESBvaktinTrackerRenderer = renderer;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var utils = (typeof globalThis !== "undefined" && globalThis.ESBvaktinTrackerUtils) || {};
  var escapeHtml = utils.escapeHtml || function (value) {
    return String(value == null ? "" : value);
  };

  function renderMessage(message, className) {
    return '<div class="' + escapeHtml(className) + '">' + escapeHtml(message) + "</div>";
  }

  function renderOptionTags(config) {
    var options = config.options || [];
    var getValue = config.getValue || function (option) {
      return option && typeof option === "object" ? option.value : option;
    };
    var getLabel = config.getLabel || function (option) {
      return option && typeof option === "object" ? option.label : option;
    };
    var selectedValue = config.selectedValue;
    var placeholder = config.placeholder;
    var html = "";

    if (placeholder != null) {
      html += '<option value="">' + escapeHtml(placeholder) + "</option>";
    }

    html += options
      .map(function (option) {
        var value = getValue(option);
        var label = getLabel(option);
        var selected = selectedValue != null && String(selectedValue) === String(value) ? " selected" : "";
        return '<option value="' + escapeHtml(value) + '"' + selected + ">" + escapeHtml(label) + "</option>";
      })
      .join("");

    return html;
  }

  function renderSelect(config) {
    var attrs = [];

    if (config.id) attrs.push('id="' + escapeHtml(config.id) + '"');
    if (config.className) attrs.push('class="' + escapeHtml(config.className) + '"');

    return "<select " + attrs.join(" ") + ">" + renderOptionTags(config) + "</select>";
  }

  function renderSearchInput(config) {
    var attrs = ['type="search"'];

    if (config.id) attrs.push('id="' + escapeHtml(config.id) + '"');
    if (config.className) attrs.push('class="' + escapeHtml(config.className) + '"');
    if (config.placeholder) attrs.push('placeholder="' + escapeHtml(config.placeholder) + '"');
    attrs.push('autocomplete="' + escapeHtml(config.autocomplete || "off") + '"');

    if (config.value != null) {
      attrs.push('value="' + escapeHtml(config.value) + '"');
    }

    var input = "<input " + attrs.join(" ") + " />";
    if (!config.wrapClass) return input;

    return '<div class="' + escapeHtml(config.wrapClass) + '">' + input + "</div>";
  }

  function renderControlBlock(config) {
    var searchHtml = config.search ? renderSearchInput(config.search) : "";
    var rows = config.rows || [];
    var rowsHtml = rows
      .map(function (row) {
        return '<div class="' + escapeHtml(row.className) + '">' + (row.controls || []).join("") + "</div>";
      })
      .join("");

    return '<div class="' + escapeHtml(config.wrapperClass) + '">' + searchHtml + rowsHtml + "</div>";
  }

  function renderStatItems(config) {
    var items = config.items || [];
    var statClass = config.statClass || "ct-stat";
    var numClass = config.numClass || "ct-stat-num";
    var labelClass = config.labelClass || "ct-stat-label";

    return items
      .map(function (item) {
        var classes = [statClass, item.className].filter(Boolean).join(" ");
        var valueId = item.valueId ? ' id="' + escapeHtml(item.valueId) + '"' : "";
        var value = item.valueHtml != null ? item.valueHtml : escapeHtml(item.value);
        var label = item.labelHtml != null ? item.labelHtml : escapeHtml(item.label);

        return (
          '<div class="' + escapeHtml(classes) + '">' +
            '<span class="' + escapeHtml(numClass) + '"' + valueId + ">" + value + "</span>" +
            '<span class="' + escapeHtml(labelClass) + '">' + label + "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderCollection(config) {
    var items = config.items || [];
    var content = items.map(config.renderItem).join("");

    if (!config.containerClass) return content;
    return '<div class="' + escapeHtml(config.containerClass) + '">' + content + "</div>";
  }

  function renderGroupedCollection(config) {
    var groups = config.groups || [];
    var getKey = config.getKey || function (group) {
      return group.key;
    };
    var getItems = config.getItems || function (group) {
      return group.items || [];
    };

    if (groups.length === 1 && !getKey(groups[0])) {
      return renderCollection({
        items: getItems(groups[0]),
        renderItem: config.renderItem,
        containerClass: config.gridClass,
      });
    }

    return groups
      .map(function (group) {
        var items = getItems(group);
        var headerHtml = config.renderHeader ? config.renderHeader(group, items.length) : "";
        var collectionHtml = renderCollection({
          items: items,
          renderItem: config.renderItem,
          containerClass: config.gridClass,
        });

        if (!config.groupClass) {
          return headerHtml + collectionHtml;
        }

        return '<div class="' + escapeHtml(config.groupClass) + '">' + headerHtml + collectionHtml + "</div>";
      })
      .join("");
  }

  return {
    renderCollection: renderCollection,
    renderControlBlock: renderControlBlock,
    renderGroupedCollection: renderGroupedCollection,
    renderMessage: renderMessage,
    renderOptionTags: renderOptionTags,
    renderSearchInput: renderSearchInput,
    renderSelect: renderSelect,
    renderStatItems: renderStatItems,
  };
});
