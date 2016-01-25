/**
Copyright (c) 2014 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../base/guid.js");
require("./event_set.js");
require("./selectable_item.js");
require("./selection_state.js");

'use strict';

/**
 * @fileoverview Provides the Event class.
 */
global.tr.exportTo('tr.model', function() {
  var SelectableItem = tr.model.SelectableItem;
  var SelectionState = tr.model.SelectionState;

  /**
   * An Event is the base type for any non-container, selectable piece
   * of data in the trace model.
   *
   * @constructor
   * @extends {SelectableItem}
   */
  function Event() {
    SelectableItem.call(this, this /* modelItem */);
    this.guid_ = tr.b.GUID.allocate();
    this.selectionState = SelectionState.NONE;
    this.associatedAlerts = new tr.model.EventSet();
    this.info = undefined;
  }

  Event.prototype = {
    __proto__: SelectableItem.prototype,

    get guid() {
      return this.guid_;
    },

    get stableId() {
      return undefined;
    },

    /** Adds the range of timestamps for this event to the specified range. */
    addBoundsToRange: function(range) {
      throw new Error('Not implemented');
    }
  };

  return {
    Event: Event
  };
});
