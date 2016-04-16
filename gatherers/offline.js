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

// *WARNING* do not use fetch.. due to it requiring window focus to fire.
// Request the current page by issuing a XMLHttpRequest request to ''
// and storing the status code on the window.
const requestPage = `
  (function () {
    const oReq = new XMLHttpRequest();
    oReq.onload = oReq.onerror = e => window._offlineRequestStatus = e.currentTarget.status;
    oReq.open('GET', '');
    oReq.send();
  })();
`;

const unsetPageStatusVar = `
  delete window._offlineRequestStatus
`;

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

  static pollForOfflineResponseStatus(driver, retryCount) {
    return driver.sendCommand('Runtime.evaluate', {
      expression: 'window._offlineRequestStatus'
    }).then(r => {
      if (r.result.type !== 'undefined' || retryCount > 9) {
        return r;
      }

      // Wait for 1.5 seconds and retry
      return new Promise((res, _) => {
        setTimeout(_ => {
          res(Offline.pollForOfflineResponseStatus(driver, retryCount + 1));
        }, 1500);
      });
    });
  }

  static _unsetOfflineValue(driver) {
    return driver.sendCommand('Runtime.evaluate', {
      expression: unsetPageStatusVar});
  }

  static getOfflinePageStatus(driver) {
    /**
     * Phases to check if we are offline:
     * 1. Issue fetch request for current url and set the status code in a var.
     * 2. Poll the window for that var to be set (since async).
     * 3. Unset the var (so things are reentrant) and return the val.
     */
    return driver.sendCommand('Runtime.evaluate', {
      expression: requestPage
    }).then(_ => {
      return Offline.pollForOfflineResponseStatus(driver, 0);
    }, _ => {
      // Account for execution errors.
      return {
        result: {
          description: '-1',
          type: 'number',
          value: -1
        }
      };
    }).then(ret => {
      return Offline._unsetOfflineValue(driver).then(_ => ret);
    });
  }

  afterReloadPageLoad(options) {
    const driver = options.driver;

    // TODO eventually we will want to walk all network
    // requests that the page initially made and retry them.
    return Offline.goOffline(driver).then(_ => {
      let responseCode;

      return Offline.getOfflinePageStatus(driver)
        .then(ret => {
          responseCode = ret.result.value;
        })
        .then(_ => Offline.goOnline(driver))
        .then(_ => {
          this.artifact = {responseCode};
        });
    });
  }
}

module.exports = Offline;
