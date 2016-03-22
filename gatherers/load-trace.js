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
const Gather = require('./gather');

class LoadTrace extends Gather {

  static gather(options) {
    const url = options.url;
    const driver = options.driver;
    const artifacts = {};

    // Begin trace and network recording.
    return driver.beginTrace()
      .then(_ => driver.beginNetworkCollect())

      // Go to the URL.
      .then(_ => driver.gotoURL(url, driver.WAIT_FOR_LOAD))

      // Pause after load
      .then(_ => new Promise((resolve, reject) => {
        setTimeout(resolve, PAUSE_AFTER_LOAD);
      }))

      // Stop recording and save the results.
      .then(_ => driver.endNetworkCollect())
      .then(networkRecords => {
        artifacts.networkRecords = networkRecords;
      })
      .then(_ => driver.endTrace())
      .then(traceContents => {
        artifacts.traceContents = traceContents;
      })

      .then(_ => artifacts);
  }
}

module.exports = LoadTrace;
