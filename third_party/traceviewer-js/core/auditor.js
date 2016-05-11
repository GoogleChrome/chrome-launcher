/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../base/base.js");
require("../base/extension_registry.js");

'use strict';

/**
 * @fileoverview Base class for auditors.
 */
global.tr.exportTo('tr.c', function() {
  function Auditor(model) {
    this.model_ = model;
  }

  Auditor.prototype = {
    __proto__: Object.prototype,

    get model() {
      return this.model_;
    },

    /**
     * Called by the Model after baking slices. May modify model.
     */
    runAnnotate: function() {
    },

    /**
     * Called by import to install userFriendlyCategoryDriver.
     */
    installUserFriendlyCategoryDriverIfNeeded: function() {
    },

    /**
     * Called by the Model after importing. Should not modify model, except
     * for adding interaction ranges and audits.
     */
    runAudit: function() {
    }
  };

  var options = new tr.b.ExtensionRegistryOptions(tr.b.BASIC_REGISTRY_MODE);
  options.defaultMetadata = {};
  options.mandatoryBaseClass = Auditor;
  tr.b.decorateExtensionRegistry(Auditor, options);

  return {
    Auditor: Auditor
  };
});
