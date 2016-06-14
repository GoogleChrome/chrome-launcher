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

class ServiceWorker extends Gather {

  /**
   * @param {string} url
   * @return {string}
   */
  static getOrigin(url) {
    const parsedURL = require('url').parse(url);
    return `${parsedURL.protocol}//${parsedURL.hostname}`;
  }

  /**
   * @param {!Array<!ServiceWorkerVersion>} versions
   * @param {string} url
   * @return {(!ServiceWorkerVersion|undefined)}
   */
  static getActivatedServiceWorker(versions, url) {
    const origin = this.getOrigin(url);
    return versions.find(v => v.status === 'activated' && this.getOrigin(v.scriptURL) === origin);
  }

  beforePass(options) {
    const driver = options.driver;
    return driver
      .getServiceWorkerVersions()
      .then(data => {
        const version = ServiceWorker.getActivatedServiceWorker(data.versions, options.url);
        const debugString = version ? undefined : 'No active service worker found for this origin.';
        return {
          version,
          debugString
        };
      })
      .catch(err => {
        return {
          debugString: `Error in querying Service Worker status: ${err.message}`
        };
      }).then(artifact => {
        this.artifact = artifact;
      });
  }
}

module.exports = ServiceWorker;
