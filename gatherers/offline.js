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

const Gather = require('./gather');

// Request the current page by issuing a sync request to ''.
const requestPage = `
  (function() {
    var request = new XMLHttpRequest();
    request.open('GET', '', false);
    request.send(null);
    return request.status;
  })();
`;

class Offline extends Gather {

  static goOffline(driver) {
    return driver.sendCommand('Network.emulateNetworkConditions', {
      offline: true,
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

  static getOfflinePageStatus(driver) {
    return driver.sendCommand('Runtime.evaluate', {
      expression: requestPage
    });
  }

  static gather(options) {
    const driver = options.driver;

    // TODO eventually we will want to walk all network
    // requests that the page initially made and retry them.
    return Offline.goOffline(driver).then(_ => {
      let responseCode;

      return Offline.getOfflinePageStatus(driver).then(ret => {
        responseCode = ret.result.value;
      }).then(_ => Offline.goOnline(driver)).then(_ => {
        return {responseCode};
      });
    });
  }
}

module.exports = Offline;
