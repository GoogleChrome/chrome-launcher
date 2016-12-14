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
'use strict';

const Gatherer = require('./gatherer');

/**
 * @fileoverview Determines the security level of the page.
 * @see https://chromedevtools.github.io/debugger-protocol-viewer/tot/Security/#type-SecurityState
 */

class HTTPS extends Gatherer {

  constructor() {
    super();
    this._noSecurityChangesTimeout = undefined;
  }

  afterPass(options) {
    // Allow override for faster testing.
    const timeout = options._testTimeout || 10000;

    const securityPromise = options.driver.getSecurityState()
      .then(state => {
        return {
          value: state.schemeIsCryptographic
        };
      }, _ => {
        return {
          value: false,
          debugString: 'Error requesting page security state.'
        };
      });

    let noSecurityChangesTimeout;
    const timeoutPromise = new Promise((resolve, reject) => {
      // Set up a timeout for ten seconds in case we don't get any
      // security events at all. If that happens, bail.
      noSecurityChangesTimeout = setTimeout(_ => {
        resolve({
          value: false,
          debugString: 'Timed out waiting for page security state.'
        });
      }, timeout);
    });

    return Promise.race([
      securityPromise,
      timeoutPromise
    ]).then(result => {
      // Clear timeout. No effect if it won, no need to wait if it lost.
      clearTimeout(noSecurityChangesTimeout);
      return result;
    });
  }
}

module.exports = HTTPS;
