/**
Copyright (c) 2013 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../base/base.js");
require("./importer.js");

'use strict';

/**
 * @fileoverview Base class for trace data importers.
 */
global.tr.exportTo('tr.importer', function() {
  /**
   * Importer for empty strings and arrays.
   * @constructor
   */
  function EmptyImporter(events) {
    this.importPriority = 0;
  };

  EmptyImporter.canImport = function(eventData) {
    if (eventData instanceof Array && eventData.length == 0)
      return true;
    if (typeof(eventData) === 'string' || eventData instanceof String) {
      return eventData.length == 0;
    }
    return false;
  };

  EmptyImporter.prototype = {
    __proto__: tr.importer.Importer.prototype,

    get importerName() {
      return 'EmptyImporter';
    }
  };

  tr.importer.Importer.register(EmptyImporter);

  return {
    EmptyImporter: EmptyImporter
  };
});
