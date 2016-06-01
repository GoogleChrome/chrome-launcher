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
  get name() {
    return 'serviceWorkers';
  }

  reloadSetup(options) {
    const driver = options.driver;
    this.resolved = false;

    this.artifactsResolved = new Promise((res, _) => {
      driver.on('ServiceWorker.workerVersionUpdated', data => {
        if (!this.resolved) {
          const controlledClients =
              ServiceWorker.getActivatedServiceWorker(data.versions, options.url);

          this.artifact = {
            versions: controlledClients ? [controlledClients] : []
          };
          this.resolved = (typeof this.artifact.versions !== 'undefined');
          res();
        }
      });
    });
  }

  static getOrigin(url) {
    const parsedURL = require('url').parse(url);
    return `${parsedURL.protocol}//${parsedURL.hostname}`;
  }

  static getActivatedServiceWorker(versions, url) {
    const origin = this.getOrigin(url);
    return versions.find(v => v.status === 'activated' && v.scriptURL.startsWith(origin));
  }

  beforeReloadPageLoad(options) {
    const driver = options.driver;
    return driver
      .sendCommand('ServiceWorker.enable')
      .then(_ => {
        return this.artifactsResolved;
      })
      .catch(_ => {
        this.artifact = {
          versions: -1
        };
        return Promise.resolve();
      });
  }
}

module.exports = ServiceWorker;
