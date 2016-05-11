/**
Copyright (c) 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./efficiency_metric.js");
require("./hazard_metric.js");
require("./responsiveness_metric.js");

'use strict';

global.tr.exportTo('tr.metrics.sh', function() {
  function SystemHealthMetrics(valueList, model) {
    tr.metrics.sh.responsivenessMetric(valueList, model);
    tr.metrics.sh.EfficiencyMetric(valueList, model);
    tr.metrics.sh.hazardMetric(valueList, model);
  }

  SystemHealthMetrics.prototype = {
    __proto__: Function.prototype
  };

  tr.metrics.MetricRegistry.register(SystemHealthMetrics);

  return {
    SystemHealthMetrics: SystemHealthMetrics
  };
});
