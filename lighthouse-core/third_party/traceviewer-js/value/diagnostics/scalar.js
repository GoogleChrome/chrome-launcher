"use strict";
/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./diagnostic.js");
require("../numeric.js");

'use strict';

global.tr.exportTo('tr.v.d', function () {
  class Scalar extends tr.v.d.Diagnostic {
    /**
     * @param {!tr.v.ScalarNumeric} value
     */
    constructor(value) {
      super();
      if (!(value instanceof tr.v.ScalarNumeric)) throw new Error("expected ScalarNumeric");
      this.value = value;
    }

    asDictInto_(d) {
      d.value = this.value.asDict();
    }

    static fromDict(d) {
      return new Scalar(tr.v.ScalarNumeric.fromDict(d.value));
    }
  }

  tr.v.d.Diagnostic.register(Scalar, {
    elementName: 'tr-v-ui-scalar-diagnostic-span'
  });

  return {
    Scalar: Scalar
  };
});