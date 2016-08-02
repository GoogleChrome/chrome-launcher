/**
Copyright (c) 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./efficiency_metric.js");
require("./hazard_metric.js");
require("./long_tasks_metric.js");
require("./power_metric.js");

'use strict';

global.tr.exportTo('tr.metrics.sh', function() {
  function systemHealthMetrics(values, model) {
    tr.metrics.sh.responsivenessMetric(values, model);
    tr.metrics.sh.efficiencyMetric(values, model);
    tr.metrics.sh.longTasksMetric(values, model);
    tr.metrics.sh.hazardMetric(values, model);
    tr.metrics.sh.powerMetric(values, model);
  }

  tr.metrics.MetricRegistry.register(systemHealthMetrics);

  return {
    systemHealthMetrics: systemHealthMetrics
  };
});
