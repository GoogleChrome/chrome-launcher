/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const Driver = require('./driver.js');
const chromeRemoteInterface = require('chrome-remote-interface');
const port = process.env.PORT || 9222;

const log = require('../../lib/log.js');

class CriDriver extends Driver {
  constructor() {
    super();

    /**
     * Chrome remote interface instance.
     */
    this._cri = null;
  }

  /**
   * @return {!Promise<undefined>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this._cri) {
        return resolve();
      }

      // Make a new tab, stopping Chrome from accidentally giving CRI an "Other" tab.
      // Also disable the lint check because CRI uses "New" for the function name.
      /* eslint-disable new-cap */
      chromeRemoteInterface.New((err, tab) => {
        if (err) {
          log.warn('CRI driver', 'cannot create new tab, will reuse tab.', err);
        }

        chromeRemoteInterface({port: port, chooseTab: tab}, chrome => {
          this._tab = tab;
          this._cri = chrome;
          // The CRI instance is also an EventEmitter, so use directly for event dispatch.
          this._eventEmitter = chrome;
          this.enableRuntimeEvents().then(_ => {
            resolve();
          });
        }).on('error', e => reject(e));
      });
      /* eslint-enable new-cap */
    });
  }

  disconnect() {
    return new Promise((resolve, reject) => {
      if (!this._tab) {
        this._cri.close();
        return resolve();
      }

      /* eslint-disable new-cap */
      chromeRemoteInterface.Close({
        id: this._tab.id
      }, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
      /* eslint-enable new-cap */
    })
    .then(() => {
      if (this._cri) {
        this._cri.close();
      }
      this._tab = null;
      this._cri = null;
      this._eventEmitter = null;
      this.url = null;
    });
  }

  /**
   * Call protocol methods
   * @param {!string} command
   * @param {!Object} params
   * @return {!Promise}
   */
  sendCommand(command, params) {
    if (this._cri === null) {
      throw new Error('connect() must be called before attempting to send a command.');
    }

    return new Promise((resolve, reject) => {
      this.formattedLog('method => browser', {method: command, params: params}, 'verbose');

      this._cri.send(command, params, (err, result) => {
        if (err) {
          this.formattedLog('method <= browser ERR', {method: command, params: result}, 'error');
          return reject(result);
        }
        this.formattedLog('method <= browser OK', {method: command, params: result}, 'verbose');
        resolve(result);
      });
    });
  }
}

module.exports = CriDriver;
