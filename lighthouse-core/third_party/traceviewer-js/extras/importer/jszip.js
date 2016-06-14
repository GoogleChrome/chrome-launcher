/**
Copyright (c) 2013 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../base/base.js");

'use strict';
// Vinn workaround for JSzip requiring window.
if (tr.isVinn) {
  /**
   * Hack.
   */
  global.window = {};
}

'use strict';
// Vinn workaround for JSzip requiring window.
if (tr.isVinn) {
  /**
   * Hack.
   */
  global.JSZip = global.window.JSZip;
  global.window = undefined;
} else if (tr.isNode) {
  var jsZipAbsPath = HTMLImportsLoader.hrefToAbsolutePath(
      '/jszip.min.js');
  var jsZipModule = require(jsZipAbsPath);
  global.JSZip = jsZipModule;
}
