/**
Copyright (c) 2013 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../base/base.js");

'use strict';
// Workaround for JSzip requiring window.
if (tr.isHeadless) {
  /**
   * Hack.
   */
  global.window = {};
}

'use strict';
// Workaround for JSzip requiring window.
if (tr.isHeadless) {
  /**
   * Hack.
   */
  global.JSZip = global.window.JSZip;
  global.window = undefined;
}
