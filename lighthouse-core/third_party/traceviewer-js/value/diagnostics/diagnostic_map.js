"use strict";
/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

/**
  Include all Diagnostic subclasses here so that DiagnosticMap.addDicts() and
  DiagnosticMap.fromDict() always have access to all subclasses in the
  Diagnostic registry.
**/

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

require("./breakdown.js");
require("./generic.js");
require("./iteration_info.js");
require("./related_event_set.js");
require("./related_histogram_breakdown.js");
require("./related_value_map.js");
require("./related_value_set.js");
require("./scalar.js");

'use strict';

global.tr.exportTo('tr.v.d', function () {
  class DiagnosticMap extends Map {
    /**
     * Add a new Diagnostic to this map.
     *
     * @param {string} name
     * @param {!tr.v.d.Diagnostic} diagnostic
     */
    set(name, diagnostic) {
      if (typeof name !== 'string') throw new Error('name must be string, not ' + name);

      if (!(diagnostic instanceof tr.v.d.Diagnostic)) throw new Error('Must be instanceof Diagnostic: ' + diagnostic);

      Map.prototype.set.call(this, name, diagnostic);
    }

    /**
     * Add Diagnostics from a dictionary of dictionaries.
     *
     * @param {Object} dict
     */
    addDicts(dict) {
      tr.b.iterItems(dict, function (name, diagnosticDict) {
        this.set(name, tr.v.d.Diagnostic.fromDict(diagnosticDict));
      }, this);
    }

    asDict() {
      var dict = {};
      for (var _ref of this) {
        var _ref2 = _slicedToArray(_ref, 2);

        var name = _ref2[0];
        var diagnostic = _ref2[1];

        dict[name] = diagnostic.asDict();
      }
      return dict;
    }

    static fromDict(d) {
      var diagnostics = new DiagnosticMap();
      diagnostics.addDicts(d);
      return diagnostics;
    }

    static fromObject(obj) {
      var diagnostics = new DiagnosticMap();
      tr.b.iterItems(obj, function (name, diagnostic) {
        diagnostics.set(name, diagnostic);
      });
      return diagnostics;
    }
  }

  return {
    DiagnosticMap: DiagnosticMap
  };
});