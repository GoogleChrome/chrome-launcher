/**
Copyright 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./time_display_mode.js");

'use strict';

global.tr.exportTo('tr.b.u', function() {
  /**
   * Scalar wrapper, representing a scalar value and its unit.
   */
  function Scalar(value, unit) {
    this.value = value;
    this.unit = unit;
  };

  Scalar.prototype = {
    toString: function() {
      return this.unit.format(this.value);
    }
  };

  return {
    Scalar: Scalar
  };
});
