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
 * @fileoverview Tests whether the page attempts to request geolocation on page load. This often
 * represents a poor user experience, since it lacks context. As such, if the page requests
 * geolocation the gatherer will intercept the call and mark a boolean flag to true. The audit that
 * corresponds with this gatherer then checks for the flag.
 * @author Paul Lewis
 */

/* global navigator, window */

/* istanbul ignore next */
function overrideGeo() {
  window.__didNotCallGeo = true;
  // Override the geo functions so that if they're called they're intercepted and we know about it.
  navigator.geolocation.getCurrentPosition =
  navigator.geolocation.watchPosition = function() {
    window.__didNotCallGeo = false;
  };
}

function collectGeoState() {
  return Promise.resolve(window.__didNotCallGeo);
}

class GeolocationOnStart extends Gatherer {

  beforePass(options) {
    return options.driver.evaluateScriptOnLoad(`(${overrideGeo.toString()}())`);
  }

  afterPass(options) {
    return options.driver.evaluateAsync(`(${collectGeoState.toString()}())`)
        .then(returnedValue => {
          this.artifact = returnedValue;
        }, _ => {
          this.artifact = -1;
          return;
        });
  }
}

module.exports = GeolocationOnStart;
