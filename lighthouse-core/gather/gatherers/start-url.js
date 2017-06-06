/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer');
const URL = require('../../lib/url-shim');
const manifestParser = require('../../lib/manifest-parser');

class StartUrl extends Gatherer {
  constructor() {
    super();

    this.startUrl = null;
    this.err = null;
  }

  executeFetchRequest(driver, url) {
    return new Promise((resolve, reject) => {
      let requestId;
      const fetchRequestId = (data) => {
        if (URL.equalWithExcludedFragments(data.request.url, url)) {
          requestId = data.requestId;
          driver.off('Network.requestWillBeSent', fetchRequestId);
        }
      };
      const fetchDone = (data) => {
        if (data.requestId === requestId) {
          driver.off('Network.loadingFinished', fetchDone);
          driver.off('Network.loadingFailed', fetchDone);

          resolve();
        }
      };

      driver.on('Network.requestWillBeSent', fetchRequestId);
      driver.on('Network.loadingFinished', fetchDone);
      driver.on('Network.loadingFailed', fetchDone);
      driver.evaluateAsync(
        `fetch('${url}')
          .then(response => response.status)
          .catch(err => -1)`
      ).catch(err => reject(err));
    });
  }

  pass(options) {
    return options.driver.getAppManifest()
      .then(response => {
        return manifestParser(response.data, response.url, options.url);
      })
      .then(manifest => {
        if (!manifest.value.start_url || !manifest.value.start_url.raw) {
          return Promise.reject(new Error(`No web app manifest found on page ${options.url}`));
        }

        if (manifest.value.start_url.debugString) {
          return Promise.reject(new Error(manifest.value.start_url.debugString));
        }

        this.startUrl = manifest.value.start_url.value;
      }).then(_ => this.executeFetchRequest(options.driver, this.startUrl));
  }

  afterPass(options, tracingData) {
    if (!this.startUrl) {
      return Promise.reject(new Error('No start_url found inside the manifest'));
    }

    const networkRecords = tracingData.networkRecords;
    const navigationRecord = networkRecords.filter(record => {
      return URL.equalWithExcludedFragments(record._url, this.startUrl) &&
        record._fetchedViaServiceWorker;
    }).pop(); // Take the last record that matches.

    return options.driver.goOnline(options)
      .then(_ => navigationRecord ? navigationRecord.statusCode : -1);
  }
}

module.exports = StartUrl;
