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
 * @author Eric Bidelman
 */

/* global window, __returnResults */

'use strict';

const Gatherer = require('../gatherer');

function patchDateNow() {
  window.__stackTraceErrors = [];
  // Override Date.now() so we know when if it's called.
  const orig = Date.now;
  Date.now = function() {
    try {
      throw Error('__called Date.now()__');
    } catch (e) {
      if (e.stack) {
        const split = e.stack.split('\n');
        const m = split[split.length - 1].match(/(https?:\/\/.*):(\d+):(\d+)/);
        if (m) {
          window.__stackTraceErrors.push({url: m[1], line: m[2], col: m[3]});
        }
      }
    }

    return orig();
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
        .then(errors => {
          this.artifact.errors = errors;
        }, _ => {
          this.artifact = -1;
          return;
        });
  }
}

module.exports = DateNowUse;
