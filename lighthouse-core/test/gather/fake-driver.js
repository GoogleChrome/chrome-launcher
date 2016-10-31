/**
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

const recordsFromLogs = require('../../lib/network-recorder').recordsFromLogs;

module.exports = {
  connect() {
    return Promise.resolve();
  },
  disconnect() {},
  gotoURL() {
    return Promise.resolve();
  },
  beginEmulation() {
    return Promise.resolve();
  },
  assertNoSameOriginServiceWorkerClients() {
    return Promise.resolve();
  },
  reloadForCleanStateIfNeeded() {
    return Promise.resolve();
  },
  enableRuntimeEvents() {
    return Promise.resolve();
  },
  cleanAndDisableBrowserCaches() {},
  clearDataForOrigin() {},
  beginTrace() {
    return Promise.resolve();
  },
  endTrace() {
    return Promise.resolve(
      require('../fixtures/traces/progressive-app.json')
    );
  },
  beginNetworkCollect() {},
  endNetworkCollect() {
    return Promise.resolve(
      recordsFromLogs(require('../fixtures/perflog.json'))
    );
  },
  getSecurityState() {
    return Promise.resolve({
      schemeIsCryptographic: true
    });
  }
};
