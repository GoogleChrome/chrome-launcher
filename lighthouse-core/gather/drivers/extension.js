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
const log = require('../../lib/log.js');
const EventEmitter = require('events').EventEmitter;

/* globals chrome */

class ExtensionDriver extends Driver {

  constructor() {
    super();
    this._tabId = null;

    this._eventEmitter = new EventEmitter();
    this._onEvent = this._onEvent.bind(this);
    this._onUnexpectedDetach = this._onUnexpectedDetach.bind(this);
  }

  _onEvent(source, method, params) {
    // log events received
    log.log('<=', method, params);

    this._eventEmitter.emit(method, params);
  }

  _onUnexpectedDetach(debuggee, detachReason) {
    this._detachCleanup();
    throw new Error('Lighthouse detached from browser: ' + detachReason);
  }

  _detachCleanup() {
    this._tabId = null;
    chrome.debugger.onEvent.removeListener(this._onEvent);
    chrome.debugger.onDetach.removeListener(this._onUnexpectedDetach);
    this._eventEmitter.removeAllListeners();
    this._eventEmitter = null;
  }

  connect() {
    if (this._tabId !== null) {
      return Promise.resolve();
    }

    return this.queryCurrentTab_()
      .then(tab => {
        const tabId = this._tabId = tab.id;
        chrome.debugger.onEvent.addListener(this._onEvent);
        chrome.debugger.onDetach.addListener(this._onUnexpectedDetach);

        return new Promise((resolve, reject) => {
          chrome.debugger.attach({tabId}, '1.1', _ => {
            if (chrome.runtime.lastError) {
              return reject(chrome.runtime.lastError);
            }
            resolve(tabId);
          });
        });
      }).then(_ => this.enableRuntimeEvents());
  }

  disconnect() {
    if (this._tabId === null) {
      return Promise.resolve();
    }

    const tabId = this._tabId;
    return new Promise((resolve, reject) => {
      chrome.debugger.detach({tabId}, _ => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve();
      });
    }).then(_ => this._detachCleanup());
  }

  reloadForCleanStateIfNeeded(options) {
    // Reload the page to remove any side-effects (like disabling JavaScript).
    const status = 'Reloading page to reset state';
    log.log('status', status);
    return this.gotoURL(options.url).then(_ => {
      log.log('statusEnd', status);
    });
  }

  /**
   * Call protocol methods
   * @param {!string} command
   * @param {!Object} params
   * @return {!Promise}
   */
  sendCommand(command, params) {
    return new Promise((resolve, reject) => {
      this.formattedLog('method => browser', {method: command, params: params}, 'verbose');
      if (!this._tabId) {
        log.error('No tabId set for sendCommand');
      }
      chrome.debugger.sendCommand({tabId: this._tabId}, command, params, result => {
        if (chrome.runtime.lastError) {
          this.formattedLog('method <= browser ERR', {method: command, params: result}, 'error');
          return reject(chrome.runtime.lastError);
        }

        if (result.wasThrown) {
          this.formattedLog('method <= browser ERR', {method: command, params: result}, 'error');
          return reject(result.exceptionDetails);
        }

        this.formattedLog('method <= browser OK', {method: command, params: result}, 'verbose');
        resolve(result);
      });
    });
  }

  queryCurrentTab_() {
    const currentTab = {
      active: true,
      windowId: chrome.windows.WINDOW_ID_CURRENT
    };

    return new Promise((resolve, reject) => {
      chrome.tabs.query(currentTab, tabs => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

        resolve(tabs[0]);
      });
    });
  }

  /**
   * Used by lighthouse-background to kick off the run on the current page
   */
  getCurrentTabURL() {
    return this.queryCurrentTab_().then(tab => tab.url);
  }
}

module.exports = ExtensionDriver;
