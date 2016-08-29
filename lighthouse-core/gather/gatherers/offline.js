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

class Offline extends Gatherer {

  static config(opts) {
    return {
      offline: opts.offline,
      // values of 0 remove any active throttling. crbug.com/456324#c9
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0
    };
  }

  static goOffline(driver) {
    // Network.enable must be called for Network.emulateNetworkConditions to work
    return driver.sendCommand('Network.enable').then(_ => {
      driver.sendCommand('Network.emulateNetworkConditions', Offline.config({offline: true}));
    });
  }

  static goOnline(driver) {
    return driver.sendCommand('Network.emulateNetworkConditions', Offline.config({offline: false}));
  }

  beforePass(options) {
    return Offline.goOffline(options.driver);
  }

  afterPass(options, tracingData) {
    const navigationRecord = tracingData.networkRecords.filter(record => {
      return record._url === options.url && record._fetchedViaServiceWorker;
    }).pop(); // Take the last record that matches.

    this.artifact = navigationRecord ? navigationRecord.statusCode : -1;

    return Offline.goOnline(options.driver);
  }
}

module.exports = Offline;
