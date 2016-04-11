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
  setup(options) {
    const driver = options.driver;
    this.resolved = false;

    this.artifactsResolved = new Promise((res, _) => {
      driver.on(
          'ServiceWorker.workerVersionUpdated', data => {
            if (ServiceWorker.getActivatedServiceWorker(data.versions) !== undefined &&
                !this.resolved) {
              this.artifact = {serviceWorkers: data};
              this.resolved = true;
              res();
            }});
    });
  }

  static getActivatedServiceWorker(versions) {
    return versions.find(v => v.status === 'activated');
  }

  beforePageLoad(options) {
    const driver = options.driver;
    driver.sendCommand('ServiceWorker.enable');

    return this.artifactsResolved;
  }
}

module.exports = ServiceWorker;
