/**
Copyright (c) 2014 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./base.js");

'use strict';

global.tr.exportTo('tr.b', function() {
  var nextGUID = 1;
  var GUID = {
    allocate: function() {
      return nextGUID++;
    },

    getLastGuid: function() {
      return nextGUID - 1;
    }
  };

  return {
    GUID: GUID
  };
});
