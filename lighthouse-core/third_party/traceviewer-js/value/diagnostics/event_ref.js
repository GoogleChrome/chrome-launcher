"use strict";
/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../base/guid.js");

'use strict';

global.tr.exportTo('tr.v.d', function () {
  /**
   * Similar to ValueRef, this is a placeholder in case the referenced Event
   * isn't available in memory to point to directly.
   */
  class EventRef {
    /**
     * @param {!Object} event
     * @param {string} event.stableId
     * @param {string} event.title
     * @param {number} event.start
     * @param {number} event.duration
     */
    constructor(event) {
      this.stableId = event.stableId;
      this.title = event.title;
      this.start = event.start;
      this.duration = event.duration;
      this.end = this.start + this.duration;

      // tr.v.d.RelatedEventSet identifies events using stableId, but
      // tr.model.EventSet uses guid.
      this.guid = tr.b.GUID.allocateSimple();
    }
  }

  return {
    EventRef: EventRef
  };
});