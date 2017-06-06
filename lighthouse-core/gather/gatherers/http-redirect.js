/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer');

/**
 * This gatherer changes the options.url so that its pass loads the http page.
 * After load it detects if its on a crypographic scheme.
 * TODO: Instead of abusing a loadPage pass for this test, it could likely just do an XHR instead
 */
class HTTPRedirect extends Gatherer {

  constructor() {
    super();
    this._preRedirectURL = undefined;
  }

  beforePass(options) {
    this._preRedirectURL = options.url;
    options.url = this._preRedirectURL.replace(/^https/, 'http');
  }

  afterPass(options) {
    // Reset the options.
    options.url = this._preRedirectURL;

    // Allow override for faster testing.
    const timeout = options._testTimeout || 10000;

    const securityPromise = options.driver.getSecurityState()
      .then(state => {
        return {
          value: state.schemeIsCryptographic
        };
      });

    let noSecurityChangesTimeout;
    const timeoutPromise = new Promise((resolve, reject) => {
      // Set up a timeout for ten seconds in case we don't get any
      // security events at all. If that happens, bail.
      noSecurityChangesTimeout = setTimeout(_ => {
        reject(new Error('Timed out waiting for HTTP redirection.'));
      }, timeout);
    });

    return Promise.race([
      securityPromise,
      timeoutPromise
    ]).then(result => {
      // Clear timeout. No effect if it won, no need to wait if it lost.
      clearTimeout(noSecurityChangesTimeout);
      return result;
    }).catch(err => {
      clearTimeout(noSecurityChangesTimeout);
      throw err;
    });
  }
}

module.exports = HTTPRedirect;
