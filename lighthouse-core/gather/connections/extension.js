/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
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
              return reject(new Error(chrome.runtime.lastError.message));
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
      log.warn('ExtensionConnection', 'disconnect() was called without an established connection.');
      return Promise.resolve();
    }

    const tabId = this._tabId;
    return new Promise((resolve, reject) => {
      chrome.debugger.detach({tabId}, _ => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        // Reload the target page to restore its state.
        chrome.tabs.reload(tabId);
        resolve();
      });
    }).then(_ => this._detachCleanup());
  }

  /**
   * @override
   * @param {!string} command
   * @param {!Object} params
   * @return {!Promise}
   */
  sendCommand(command, params) {
    return new Promise((resolve, reject) => {
      log.formatProtocol('method => browser', {method: command, params: params}, 'verbose');
      if (!this._tabId) {
        log.error('ExtensionConnection', 'No tabId set for sendCommand');
      }

      chrome.debugger.sendCommand({tabId: this._tabId}, command, params, result => {
        if (chrome.runtime.lastError) {
          // The error from the extension has a `message` property that is the
          // stringified version of the actual protocol error object.
          const message = chrome.runtime.lastError.message;
          let errorMessage;
          try {
            errorMessage = JSON.parse(message).message;
          } catch (e) {}
          errorMessage = errorMessage || 'Unknown debugger protocol error.';

          log.formatProtocol('method <= browser ERR', {method: command}, 'error');
          return reject(new Error(`Protocol error (${command}): ${errorMessage}`));
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
        currentWindow: true
      };

      chrome.tabs.query(queryOpts, (tabs => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        if (tabs.length === 0) {
          const message = 'Couldn\'t resolve current tab. Please file a bug.';
          return reject(new Error(message));
        }
        if (tabs.length > 1) {
          log.warn('ExtensionConnection', '_queryCurrentTab returned multiple tabs');
        }
        resolve(tabs[0]);
      }));
    });
  }

  /**
   * Used by lighthouse-background to kick off the run on the current page
   */
  getCurrentTabURL() {
    return this._queryCurrentTab().then(tab => {
      if (!tab.url) {
        log.error('ExtensionConnection', 'getCurrentTabURL returned empty string', tab);
      }
      return tab.url;
    });
  }
}

module.exports = ExtensionConnection;
