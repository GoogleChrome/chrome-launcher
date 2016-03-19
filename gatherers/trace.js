/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const PAUSE_AFTER_LOAD = 3000;

var TraceGatherer = {
  run: function(driver, url) {
    let artifacts = {};

    return driver.disableCaching()
      // Begin trace and network recording.
      .then(driver.beginTrace)
      .then(driver.beginNetworkCollect)

      // Go to the URL.
      .then(_ => driver.gotoURL(url, driver.WAIT_FOR_LOAD))

      // Pause after load
      .then(_ => new Promise((resolve, reject) => {
        setTimeout(resolve, PAUSE_AFTER_LOAD);
      }))

      // Stop recording and save the results.
      .then(driver.endNetworkCollect)
      .then(networkRecords => {
        artifacts.networkRecords = networkRecords;
      })
      .then(driver.endTrace)
      .then(traceContents => {
        artifacts.traceContents = traceContents;
      })

      .then(_ => artifacts);
  }
};

module.exports = TraceGatherer;
