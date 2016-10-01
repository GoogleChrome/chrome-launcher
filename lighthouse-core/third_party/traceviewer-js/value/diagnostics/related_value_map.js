"use strict";
/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

require("../../base/iteration_helpers.js");
require("./diagnostic.js");
require("./value_ref.js");

'use strict';

global.tr.exportTo('tr.v.d', function () {
  class RelatedValueMap extends tr.v.d.Diagnostic {
    constructor() {
      super();
      this.valuesByName_ = new Map();
    }

    /**
     * Lookup a Histogram by name. Returns undefined if |name| is not found.
     *
     * @param {string} name
     * @return {!tr.v.d.ValueRef|!tr.v.Histogram|undefined}
     */
    get(name) {
      return this.valuesByName_.get(name);
    }

    /**
     * Add a Histogram by an explicit name to this map.
     *
     * @param {string} name
     * @param {!(tr.v.d.ValueRef|tr.v.Histogram)} value
     */
    set(name, value) {
      if (!(value instanceof tr.v.Histogram) && !(value instanceof tr.v.d.ValueRef)) throw new Error('Must be instanceof Histogram or ValueRef: ' + value);

      this.valuesByName_.set(name, value);
    }

    /**
     * Add a Histogram implicitly by its own name to this map.
     *
     * @param {!(tr.v.d.ValueRef|tr.v.Histogram)} value
     */
    add(value) {
      this.set(value.name, value);
    }

    get length() {
      return this.valuesByName_.size;
    }

    *[Symbol.iterator]() {
      for (var pair of this.valuesByName_) yield pair;
    }

    /**
     * Resolve all ValueRefs into Values by looking up their guids in
     * |valueSet|.
     * If a value cannot be found and |opt_required| is true, then throw an
     * Error.
     * If a value cannot be found and |opt_required| is false, then the ValueRef
     * will remain a ValueRef.
     *
     * @param {!tr.v.ValueSet} valueSet
     * @param {boolean=} opt_required
     */
    resolve(valueSet, opt_required) {
      for (var _ref of this) {
        var _ref2 = _slicedToArray(_ref, 2);

        var name = _ref2[0];
        var value = _ref2[1];

        if (!(value instanceof tr.v.d.ValueRef)) continue;

        var guid = value.guid;
        value = valueSet.lookup(guid);
        if (value instanceof tr.v.Histogram) this.valuesByName_.set(name, value);else if (opt_required) throw new Error('Unable to find Histogram ' + guid);
      }
    }

    asDictInto_(d) {
      d.values = {};
      for (var _ref3 of this) {
        var _ref4 = _slicedToArray(_ref3, 2);

        var name = _ref4[0];
        var value = _ref4[1];

        d.values[name] = value.guid;
      }
    }

    static fromDict(d) {
      var map = new RelatedValueMap();
      tr.b.iterItems(d.values, function (name, guid) {
        map.set(name, new tr.v.d.ValueRef(guid));
      });
      return map;
    }
  }

  tr.v.d.Diagnostic.register(RelatedValueMap, {
    elementName: 'tr-v-ui-related-value-map-span'
  });

  return {
    RelatedValueMap: RelatedValueMap
  };
});