/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Tests whether the page is using Date.now().
 */

/* global window, __returnResults */

'use strict';

const Gatherer = require('../gatherer');

function patchDateNow() {
  window.__stackTraceErrors = [];
  // Override Date.now() so we know when if it's called.
  const origDateNow = Date.now;
  const originalPrepareStackTrace = Error.prepareStackTrace;
  Date.now = function() {
    // See v8's Stack Trace API https://github.com/v8/v8/wiki/Stack-Trace-API#customizing-stack-traces
    Error.prepareStackTrace = function(error, structStackTrace) {
      const lastCallFrame = structStackTrace[structStackTrace.length - 1];
      const file = lastCallFrame.getFileName();
      const line = lastCallFrame.getLineNumber();
      const col = lastCallFrame.getColumnNumber();
      window.__stackTraceErrors.push({url: file, line, col});
      return {url: file, line, col}; // return value populates e.stack.
    };
    Error.captureStackTrace(new Error('__called Date.now()__'));
    // Remove custom formatter so future results use v8's formatter.
    Error.prepareStackTrace = originalPrepareStackTrace;
    return origDateNow();
  };
}

function collectDateNowUsage() {
  __returnResults(window.__stackTraceErrors);
}

class DateNowUse extends Gatherer {

  beforePass(options) {
    return options.driver.evaluateScriptOnLoad(`(${patchDateNow.toString()}())`);
  }

  afterPass(options) {
    return options.driver.evaluateAsync(`(${collectDateNowUsage.toString()}())`)
        .then(dateNowUses => {
          this.artifact.dateNowUses = dateNowUses;
        }, _ => {
          this.artifact = -1;
          return;
        });
  }
}

module.exports = DateNowUse;
