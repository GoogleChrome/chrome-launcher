/**
Copyright (c) 2013 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/



/**
The chrome config is heavily used:
  - chrome://tracing,
  - trace2html, which in turn implies
    - adb_profile_chrome
    - telemetry
**/

require("./android/android_auditor.js");
require("./chrome/blame_context/blame_context.js");
require("./chrome/blame_context/frame_tree_node.js");
require("./chrome/blame_context/render_frame.js");
require("./chrome/blame_context/top_level.js");
require("./chrome/chrome_auditor.js");
require("./chrome/layout_object.js");
require("./chrome/layout_tree.js");
require("./importer/etw/etw_importer.js");
require("./importer/gzip_importer.js");
require("./importer/trace2html_importer.js");
require("./importer/v8/v8_log_importer.js");
require("./importer/zip_importer.js");
require("./lean_config.js");
require("./measure/measure.js");
require("./net/net.js");
require("./systrace_config.js");
require("./vsync/vsync_auditor.js");
