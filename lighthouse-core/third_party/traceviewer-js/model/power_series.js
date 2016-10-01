"use strict";
/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../base/range.js");
require("../base/sorted_array_utils.js");
require("../base/unit_scale.js");
require("./event_container.js");
require("./power_sample.js");

'use strict';

global.tr.exportTo('tr.model', function () {

  var PowerSample = tr.model.PowerSample;

  /**
   * A container holding a time series of power samples.
   *
   * @constructor
   * @extends {EventContainer}
   */
  function PowerSeries(device) {
    tr.model.EventContainer.call(this);

    this.device_ = device;
    this.samples_ = [];
  }

  PowerSeries.prototype = {
    __proto__: tr.model.EventContainer.prototype,

    get device() {
      return this.device_;
    },

    get samples() {
      return this.samples_;
    },

    get stableId() {
      return this.device_.stableId + '.PowerSeries';
    },

    /**
     * Adds a power sample to the series and returns it.
     *
     * Note: Samples must be added in chronological order.
     */
    addPowerSample: function (ts, val) {
      var sample = new PowerSample(this, ts, val);
      this.samples_.push(sample);
      return sample;
    },

    /**
     * Returns the total energy (in Joules) consumed between the specified
     * start and end timestamps (in milliseconds).
     */
    getEnergyConsumedInJ: function (start, end) {
      var measurementRange = tr.b.Range.fromExplicitRange(start, end);

      var energyConsumedInJ = 0;
      var startIndex = tr.b.findLowIndexInSortedArray(this.samples, x => x.start, start) - 1;
      var endIndex = tr.b.findLowIndexInSortedArray(this.samples, x => x.start, end);

      if (startIndex < 0) startIndex = 0;

      for (var i = startIndex; i < endIndex; i++) {
        var sample = this.samples[i];
        var nextSample = this.samples[i + 1];

        var sampleRange = new tr.b.Range();
        sampleRange.addValue(sample.start);
        sampleRange.addValue(nextSample ? nextSample.start : sample.start);

        var intersectionRangeInMs = measurementRange.findIntersection(sampleRange);

        var durationInS = tr.b.convertUnit(intersectionRangeInMs.duration, tr.b.UnitScale.Metric.MILLI, tr.b.UnitScale.Metric.NONE);

        energyConsumedInJ += durationInS * sample.powerInW;
      }

      return energyConsumedInJ;
    },

    getSamplesWithinRange: function (start, end) {
      var startIndex = tr.b.findLowIndexInSortedArray(this.samples, x => x.start, start);
      var endIndex = tr.b.findLowIndexInSortedArray(this.samples, x => x.start, end);
      return this.samples.slice(startIndex, endIndex);
    },

    shiftTimestampsForward: function (amount) {
      for (var i = 0; i < this.samples_.length; ++i) this.samples_[i].start += amount;
    },

    updateBounds: function () {
      this.bounds.reset();

      if (this.samples_.length === 0) return;

      this.bounds.addValue(this.samples_[0].start);
      this.bounds.addValue(this.samples_[this.samples_.length - 1].start);
    },

    childEvents: function* () {
      yield* this.samples_;
    }
  };

  return {
    PowerSeries: PowerSeries
  };
});