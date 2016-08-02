/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../base/range.js");
require("./metric_registry.js");
require("../value/numeric.js");
require("../value/value.js");

'use strict';

global.tr.exportTo('tr.metrics', function() {
  var sizeInBytes_smallerIsBetter =
      tr.v.Unit.byName.sizeInBytes_smallerIsBetter;

  var SIZE_NUMERIC_BUILDER = tr.v.NumericBuilder.createLinear(
      sizeInBytes_smallerIsBetter, tr.b.Range.fromExplicitRange(1, 100), 100);

  function sampleMetric(values, model) {
    var n1 = new tr.v.ScalarNumeric(sizeInBytes_smallerIsBetter, 1);
    var n2 = new tr.v.ScalarNumeric(sizeInBytes_smallerIsBetter, 2);
    var n3 = SIZE_NUMERIC_BUILDER.build();
    n3.add(1);
    values.addValue(new tr.v.NumericValue('foo', n1));
    values.addValue(new tr.v.NumericValue('bar', n2));
    values.addValue(new tr.v.NumericValue('baz', n3));
  }

  function sampleMetric2(values, model) {
    var n1 = new tr.v.ScalarNumeric(sizeInBytes_smallerIsBetter, 1);
    var n2 = new tr.v.ScalarNumeric(sizeInBytes_smallerIsBetter, 2);
    var n3 = SIZE_NUMERIC_BUILDER.build();
    n3.add(1);
    values.addValue(new tr.v.NumericValue('one', n1));
    values.addValue(new tr.v.NumericValue('two', n2));
    values.addValue(new tr.v.NumericValue('three', n3));
  }

  tr.metrics.MetricRegistry.register(sampleMetric);
  tr.metrics.MetricRegistry.register(sampleMetric2);

  return {
    sampleMetric: sampleMetric,
    sampleMetric2: sampleMetric2
  };
});
