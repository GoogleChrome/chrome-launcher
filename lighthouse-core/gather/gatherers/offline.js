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
    const driver = options.driver;

    return driver.gotoURL(options.url, {waitForLoad: true})
      .then(_ => Offline.goOffline(driver))
      // Navigate away, then back, to allow a service worker that doesn't call
      // clients.claim() to take control of the page load.
      .then(_ => driver.gotoURL('about:blank'))
      .then(_ => driver.gotoURL(options.url, {waitForLoad: true}))
      .then(_ => Offline.goOnline(driver));
  }

  afterPass(options, tracingData) {
    const navigationRecord = tracingData.networkRecords.filter(record => {
      // If options.url is just an origin without a path, the Chrome will
      // implicitly add in a path of '/'.
      return (record._url === options.url || record._url === options.url + '/') &&
        record._fetchedViaServiceWorker;
    }).pop(); // Take the last record that matches.

    this.artifact = navigationRecord ? navigationRecord.statusCode : -1;
  }
}

module.exports = Offline;
