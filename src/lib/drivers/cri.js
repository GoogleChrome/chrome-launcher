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

const log = require('../log.js');

class CriDriver extends Driver {

  /**
   * @return {!Promise<null>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this._chrome) {
        return resolve();
      }

      // Make a new tab, stopping Chrome from accidentally giving CRI an "Other" tab.
      // Also disable the lint check because CRI uses "New" for the function name.
      /* eslint-disable new-cap */
      chromeRemoteInterface.New((err, tab) => {
        if (err) {
          return reject(err);
        }

        chromeRemoteInterface({port: port, chooseTab: tab}, chrome => {
          this._chrome = chrome;
          this.beginLogging();
          this.enableRuntimeEvents().then(_ => {
            resolve();
          });
        }).on('error', e => reject(e));
      });
      /* eslint-enable new-cap */
    });
  }

  disconnect() {
    if (this._chrome === null) {
      return;
    }

    this._chrome.close();
    this._chrome = null;
    this.url = null;
  }

  beginLogging() {
    // log events received
    this._chrome.on('event', req => _log('verbose', '<=', req));
  }

  /**
   * Bind listeners for protocol events
   * @param {!string} eventName
   * @param {function(...)} cb
   */
  on(eventName, cb) {
    if (this._chrome === null) {
      throw new Error('connect() must be called before attempting to listen to events.');
    }
    // log event listeners being bound
    _log('info', 'listen for event =>', {method: eventName});
    this._chrome.on(eventName, cb);
  }

  /**
   * Unbind event listeners
   * @param {!string} eventName
   * @param {function(...)} cb
   */
  off(eventName, cb) {
    if (this._chrome === null) {
      throw new Error('connect() must be called before attempting to remove an event listener.');
    }

    this._chrome.removeListener(eventName, cb);
  }

  /**
   * Call protocol methods
   * @param {!string} command
   * @param {!Object} params
   * @return {!Promise}
   */
  sendCommand(command, params) {
    if (this._chrome === null) {
      throw new Error('connect() must be called before attempting to send a command.');
    }

    return new Promise((resolve, reject) => {
      _log('http', 'method => browser', {method: command, params: params});

      this._chrome.send(command, params, (err, result) => {
        if (err) {
          _log('error', 'method <= browser', {method: command, params: result});
          return reject(result);
        }
        _log('http', 'method <= browser OK', {method: command, params: result});
        resolve(result);
      });
    });
  }
}

function _log(level, prefix, data) {
  const columns = (typeof process === 'undefined') ? Infinity : process.stdout.columns;
  const maxLength = columns - data.method.length - prefix.length - 7;
  const snippet = data.params ? JSON.stringify(data.params).substr(0, maxLength) : '';
  log.log(level, prefix, data.method, snippet);
}

module.exports = CriDriver;
