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
 * @fileoverview Captures calls to the geolocation API on page load.
 */

'use strict';

const Gatherer = require('../gatherer');

class GeolocationOnStart extends Gatherer {

  beforePass(options) {
    this.collectCurrentPosUsage = options.driver.captureFunctionCallSites(
        'navigator.geolocation.getCurrentPosition');
    this.collectWatchPosUsage = options.driver.captureFunctionCallSites(
        'navigator.geolocation.watchPosition');
  }

  /**
   * @param {!Object} options
   * @return {!Promise<!Array<{url: string, line: number, col: number}>>}
   */
  afterPass(options) {
    return options.driver.evaluateAsync('(function(){return window.isSecureContext;})()')
      .then(isSecureContext => {
        if (!isSecureContext) {
          throw new Error('Unable to determine if the Geolocation permission requested on page ' +
              'load because the page is not hosted on a secure origin. The Geolocation API ' +
              'requires an https URL.');
        }
      })
      .then(_ => options.driver.queryPermissionState('geolocation'))
      .then(state => {
        if (state === 'granted' || state === 'denied') {
          throw new Error('Unable to determine if the Geolocation permission was ' +
              `requested on page load because it was already ${state}. ` +
              'Try resetting the permission and running Lighthouse again.');
        }

        return this.collectCurrentPosUsage().then(results => {
          return this.collectWatchPosUsage().then(results2 => results.concat(results2));
        });
      });
  }
}

module.exports = GeolocationOnStart;
