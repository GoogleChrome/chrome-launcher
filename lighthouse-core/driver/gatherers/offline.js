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

/* global XMLHttpRequest, __returnResults */

'use strict';

const Gather = require('./gather');

// *WARNING* do not use fetch.. due to it requiring window focus to fire.
// Request the current page by issuing a XMLHttpRequest request to ''
// and storing the status code on the window.
// This runs in the context of the page, so we don't cover it with unit tests.
/* istanbul ignore next */
const requestPage = function() {
  const oReq = new XMLHttpRequest();
  oReq.onload = oReq.onerror = e => {
    // __returnResults is injected by driver.evaluateAsync
    __returnResults(e.currentTarget.status);
  };
  oReq.open('GET', '');
  oReq.send();
};

class Offline extends Gather {

  static goOffline(driver) {
    return driver.sendCommand('Network.emulateNetworkConditions', {
      offline: true,
      // values of 0 remove any active throttling. crbug.com/456324#c9
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0
    });
  }

  static goOnline(driver) {
    return driver.sendCommand('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0
    });
  }

  afterPass(options) {
    const driver = options.driver;

    // TODO eventually we will want to walk all network
    // requests that the page initially made and retry them.
    return Offline
        .goOffline(driver)
        .then(_ => driver.evaluateAsync(`(${requestPage.toString()}())`))
        .then(offlineResponseCode => {
          this.artifact = offlineResponseCode;
        })
        .then(_ => Offline.goOnline(driver))
        .catch(_ => {
          this.artifact = {
            offlineResponseCode: -1
          };
        });
  }
}

module.exports = Offline;
