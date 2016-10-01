"use strict";
/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../base/base.js");

'use strict';

global.tr.exportTo('tr.v.d', function () {
  /** @constructor */
  function ValueRef(guid) {
    this.guid = guid;
  }

  return {
    ValueRef: ValueRef
  };
});