/**
Copyright 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./unit_scale.js");

'use strict';

/**
 * @fileoverview Time currentDisplayUnit
 */
global.tr.exportTo('tr.v', function() {
  var msDisplayMode = {
    scale: 1e-3,
    suffix: 'ms',
    // Compares a < b with adjustments to precision errors.
    roundedLess: function(a, b) {
      return Math.round(a * 1000) < Math.round(b * 1000);
    },
    formatSpec: {
      unit: 's',
      unitPrefix: tr.v.UnitScale.MetricTime.MILLI,
      minimumFractionDigits: 3,
    }
  };

  var nsDisplayMode = {
    scale: 1e-9,
    suffix: 'ns',
    // Compares a < b with adjustments to precision errors.
    roundedLess: function(a, b) {
      return Math.round(a * 1000000) < Math.round(b * 1000000);
    },
    formatSpec: {
      unit: 's',
      unitPrefix: tr.v.UnitScale.MetricTime.NANO,
      maximumFractionDigits: 0
    }
  };

  var TimeDisplayModes = {
    ns: nsDisplayMode,
    ms: msDisplayMode
  };

  return {
    TimeDisplayModes: TimeDisplayModes
  };
});
