/**
Copyright (c) 2013 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../base/base.js");
require("../../base/range_utils.js");
require("../../core/auditor.js");
require("./cc/input_latency_async_slice.js");
require("./chrome_user_friendly_category_driver.js");
require("../../model/constants.js");
require("../../model/event_info.js");
require("../../model/helpers/chrome_model_helper.js");

'use strict';

/**
 * @fileoverview Base class for trace data Auditors.
 */
global.tr.exportTo('tr.e.audits', function() {
  var Auditor = tr.c.Auditor;

  /**
   * Auditor for Chrome-specific traces.
   * @constructor
   */
  function ChromeAuditor(model) {
    Auditor.call(this, model);

    var modelHelper = this.model.getOrCreateHelper(
        tr.model.helpers.ChromeModelHelper);
    if (modelHelper && modelHelper.browserHelper) {
      // Must be a browserHelper in order to do audits.
      this.modelHelper = modelHelper;
    } else {
      this.modelHelper = undefined;
    }
  };

  ChromeAuditor.prototype = {
    __proto__: Auditor.prototype,

    runAnnotate: function() {
      if (!this.modelHelper)
        return;

      for (var pid in this.modelHelper.rendererHelpers) {
        var rendererHelper = this.modelHelper.rendererHelpers[pid];

        if (rendererHelper.isChromeTracingUI)
          rendererHelper.process.important = false;
      }
    },

    /**
     * Called by import to install userFriendlyCategoryDriver.
     */
    installUserFriendlyCategoryDriverIfNeeded: function() {
      this.model.addUserFriendlyCategoryDriver(
          tr.e.chrome.ChromeUserFriendlyCategoryDriver);
    },

    runAudit: function() {
      if (!this.modelHelper)
        return;

      this.model.replacePIDRefsInPatchups(
          tr.model.BROWSER_PROCESS_PID_REF,
          this.modelHelper.browserProcess.pid);
      this.model.applyObjectRefPatchups();
    }
  };

  Auditor.register(ChromeAuditor);

  return {
    ChromeAuditor: ChromeAuditor
  };
});
