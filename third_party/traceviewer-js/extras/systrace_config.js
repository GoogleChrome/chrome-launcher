/**
Copyright (c) 2013 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./android/android_auditor.js");
require("./importer/android/event_log_importer.js");
require("./importer/battor_importer.js");
require("./importer/ddms_importer.js");
require("./importer/linux_perf/ftrace_importer.js");
require("./vsync/vsync_auditor.js");
require("../importer/import.js");
require("../model/model.js");
