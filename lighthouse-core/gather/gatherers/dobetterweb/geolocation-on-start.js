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

/* global navigator */

/* istanbul ignore next */
function queryGeolocationPermission() {
  return navigator.permissions.query({name: 'geolocation'}).then(result => {
    return result.state;
  });
}

class GeolocationOnStart extends Gatherer {

  beforePass(options) {
    this.collectCurrentPosUsage = options.driver.captureFunctionCallSites(
        'navigator.geolocation.getCurrentPosition');
    this.collectWatchPosUsage = options.driver.captureFunctionCallSites(
        'navigator.geolocation.watchPosition');
  }

  afterPass(options) {
    return options.driver.evaluateAsync(`(${queryGeolocationPermission.toString()}())`)
        .then(state => {
          if (state === 'granted') {
            this.artifact = {
              value: -1,
              debugString: 'Unable to determine if this permission was requested ' +
                           'on page load because it had already been granted. ' +
                           'Try resetting the permission and run Lighthouse again.'
            };
            return;
          }

          return this.collectCurrentPosUsage().then(results => {
            return this.collectWatchPosUsage().then(results2 => results.concat(results2));
          }).then(results => {
            this.artifact.usage = results;
          });
        }).catch(e => {
          this.artifact = {
            value: -1,
            debugString: e.message
          };
        });
  }
}

module.exports = GeolocationOnStart;
