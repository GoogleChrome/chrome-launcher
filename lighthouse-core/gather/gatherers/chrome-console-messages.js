/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Gathers console deprecation and intervention warnings logged by Chrome.
 */

'use strict';

const Gatherer = require('./gatherer');

class ChromeConsoleMessages extends Gatherer {

  constructor() {
    super();
    this._logEntries = [];
    this._onConsoleEntryAdded = this.onConsoleEntry.bind(this);
  }

  onConsoleEntry(entry) {
    this._logEntries.push(entry);
  }

  beforePass(options) {
    const driver = options.driver;
    driver.on('Log.entryAdded', this._onConsoleEntryAdded);
    return driver.sendCommand('Log.enable')
      .then(() => driver.sendCommand('Log.startViolationsReport', {
        config: [{name: 'discouragedAPIUse', threshold: -1}]
      }));
  }

  afterPass(options) {
    return Promise.resolve()
        .then(_ => options.driver.sendCommand('Log.stopViolationsReport'))
        .then(_ => options.driver.off('Log.entryAdded', this._onConsoleEntryAdded))
        .then(_ => options.driver.sendCommand('Log.disable'))
        .then(_ => this._logEntries);
  }
}

module.exports = ChromeConsoleMessages;
