"use strict";
/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../base/guid.js");
require("../base/range.js");
require("./event_container.js");
require("./power_series.js");

'use strict';

/**
 * @fileoverview Provides the Device class.
 */
global.tr.exportTo('tr.model', function () {

  /**
   * Device represents the device-level objects in the model.
   * @constructor
   * @extends {tr.model.EventContainer}
   */
  function Device(model) {
    if (!model) throw new Error('Must provide a model.');

    tr.model.EventContainer.call(this);

    this.powerSeries_ = undefined;
    this.vSyncTimestamps_ = [];
  };

  Device.compare = function (x, y) {
    return x.guid - y.guid;
  };

  Device.prototype = {
    __proto__: tr.model.EventContainer.prototype,

    compareTo: function (that) {
      return Device.compare(this, that);
    },

    get userFriendlyName() {
      return 'Device';
    },

    get userFriendlyDetails() {
      return 'Device';
    },

    get stableId() {
      return 'Device';
    },

    getSettingsKey: function () {
      return 'device';
    },

    get powerSeries() {
      return this.powerSeries_;
    },

    set powerSeries(powerSeries) {
      this.powerSeries_ = powerSeries;
    },

    get vSyncTimestamps() {
      return this.vSyncTimestamps_;
    },

    set vSyncTimestamps(value) {
      this.vSyncTimestamps_ = value;
    },

    updateBounds: function () {
      this.bounds.reset();
      for (var child of this.childEventContainers()) {
        child.updateBounds();
        this.bounds.addRange(child.bounds);
      }
    },

    shiftTimestampsForward: function (amount) {
      for (var child of this.childEventContainers()) {
        child.shiftTimestampsForward(amount);
      }

      for (var i = 0; i < this.vSyncTimestamps_.length; i++) this.vSyncTimestamps_[i] += amount;
    },

    addCategoriesToDict: function (categoriesDict) {},

    childEventContainers: function* () {
      if (this.powerSeries_) yield this.powerSeries_;
    }
  };

  return {
    Device: Device
  };
});