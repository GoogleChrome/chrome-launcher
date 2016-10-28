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

const Connection = require('./connection.js');
const log = require('../../lib/log.js');

/* globals chrome */

class ExtensionConnection extends Connection {

  constructor() {
    super();
    this._tabId = null;

    this._onEvent = this._onEvent.bind(this);
    this._onUnexpectedDetach = this._onUnexpectedDetach.bind(this);
  }

  _onEvent(source, method, params) {
    // log events received
    log.log('<=', method, params);
    this.emitNotification(method, params);
  }

  _onUnexpectedDetach(debuggee, detachReason) {
    this._detachCleanup();
    throw new Error('Lighthouse detached from browser: ' + detachReason);
  }

  _detachCleanup() {
    this._tabId = null;
    chrome.debugger.onEvent.removeListener(this._onEvent);
    chrome.debugger.onDetach.removeListener(this._onUnexpectedDetach);
    this.dispose();
  }

  /**
   * @override
   * @return {!Promise}
   */
  connect() {
    if (this._tabId !== null) {
      return Promise.resolve();
    }

    return this._queryCurrentTab()
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
      });
  }

  /**
   * @override
   * @return {!Promise}
   */
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
        // Reload the target page to restore its state.
        chrome.tabs.reload(tabId);
        resolve();
      });
    }).then(_ => this._detachCleanup());
  }

  /**
   * @override
   * @param {!string} method
   * @param {!Object} params
   * @return {!Promise}
   */
  sendCommand(command, params) {
    return new Promise((resolve, reject) => {
      log.formatProtocol('method => browser', {method: command, params: params}, 'verbose');
      if (!this._tabId) {
        log.error('No tabId set for sendCommand');
      }
      chrome.debugger.sendCommand({tabId: this._tabId}, command, params, result => {
        if (chrome.runtime.lastError) {
          log.formatProtocol('method <= browser ERR', {method: command, params: result}, 'error');
          return reject(chrome.runtime.lastError);
        }

        if (result.wasThrown) {
          log.formatProtocol('method <= browser ERR', {method: command, params: result}, 'error');
          return reject(result.exceptionDetails);
        }

        log.formatProtocol('method <= browser OK', {method: command, params: result}, 'verbose');
        resolve(result);
      });
    });
  }

  _queryCurrentTab() {
    return new Promise((resolve, reject) => {
      const queryOpts = {
        active: true,
        lastFocusedWindow: true,
        windowType: 'normal'
      };

      chrome.tabs.query(queryOpts, (tabs => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        if (tabs.length === 0) {
          const message = 'Couldn\'t resolve current tab. Please file a bug.';
          return reject(new Error(message));
        }
        resolve(tabs[0]);
      }));
    });
  }

  /**
   * Used by lighthouse-background to kick off the run on the current page
   */
  getCurrentTabURL() {
    return this._queryCurrentTab().then(tab => tab.url);
  }

  getCurrentTabId() {
    return this._queryCurrentTab().then(currentTab => {
      return new Promise((resolve, reject) => {
        chrome.debugger.getTargets(targets => {
          const target = targets.find(target => target.tabId === currentTab.id);

          if (!target) {
            reject(new Error('We can\'t find a target id.'));
          }

          resolve(target.id);
        });
      });
    });
  }
}

module.exports = ExtensionConnection;
