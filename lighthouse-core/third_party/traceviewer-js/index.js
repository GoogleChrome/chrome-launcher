/**
Copyright (c) 2014 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./importer/import.js");
tr.isHeadless = true;
require("./model/model.js");
require("./extras/full_config.js");
require("./metrics/value_list.js");
require("./metrics/all_metrics.js");
