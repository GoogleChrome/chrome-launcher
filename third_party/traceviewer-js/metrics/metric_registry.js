/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../base/base.js");
require("../base/extension_registry.js");
require("../base/iteration_helpers.js");

'use strict';

global.tr.exportTo('tr.metrics', function() {

  function MetricRegistry() {}

  var options = new tr.b.ExtensionRegistryOptions(tr.b.BASIC_REGISTRY_MODE);
  options.defaultMetadata = {};
  options.mandatoryBaseClass = Function;
  tr.b.decorateExtensionRegistry(MetricRegistry, options);

  return {
    MetricRegistry: MetricRegistry
  };
});
