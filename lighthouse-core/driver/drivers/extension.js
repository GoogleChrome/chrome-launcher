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

/* globals chrome */

class ExtensionDriver extends Driver {

  constructor() {
    super();
    this._listeners = {};
    this._tabId = null;
    this._debuggerConnected = false;
    chrome.debugger.onEvent.addListener(this._onEvent.bind(this));
    this.handleUnexpectedDetach();
  }

  connect() {
    if (this._debuggerConnected) {
      return Promise.resolve();
    }

    return this.queryCurrentTab_()
      .then(tabId => {
        this._tabId = tabId;
        this.beginLogging();
        return this.attachDebugger_(tabId)
            .then(_ => this.enableRuntimeEvents());
      });
  }

  disconnect() {
    if (this._tabId === null) {
      return Promise.resolve();
    }

    return this.detachDebugger_(this._tabId)
        .then(_ => {
          this._tabId = null;
          this.url = null;
          this._debuggerConnected = false;
        });
  }

  beginLogging() {
    // log events received
    chrome.debugger.onEvent.addListener((source, method, params) =>
     log.log('<=', method, params)
    );
  }

  /**
   * Bind listeners for protocol events
   * @param {!string} eventName
   * @param {function(...)} cb
   */
  on(eventName, cb) {
    if (typeof this._listeners[eventName] === 'undefined') {
      this._listeners[eventName] = [];
    }
    // log event listeners being bound
    log.log('listen for event =>', eventName);
    this._listeners[eventName].push(cb);
  }

  /**
   * Bind a one-time listener for protocol events. Listener is removed once it
   * has been called.
   * @param {!string} eventName
   * @param {function(...)} cb
   */
  once(eventName, cb) {
    // Create a replacement listener that will immediately remove itself after calling cb once.
    const cbGuard = function() {
      cb(...arguments);
      this.off(eventName, cbGuard);
    }.bind(this);

    this.on(eventName, cbGuard);
  }

  _onEvent(source, method, params) {
    if (this._listeners[method] === undefined) {
      return;
    }

    // Copy array of listeners so all listeners are called, even if some removed
    // during loop over listeners. Consistent with node's removeListener behavior:
    // https://nodejs.org/api/events.html#events_emitter_removelistener_eventname_listener
    const listenersCopy = Array.from(this._listeners[method]);
    listenersCopy.forEach(cb => {
      // despite best efforts, this still sometimes loses the context of the instance,
      // which means sendCommand will not have this._tabId. Luckily, it doesn't need it
      // for trace-based commands like IO.read.
      cb.call(this, params);
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
      log.log('method => browser', command, params);
      if (!this._tabId) {
        log.log('error', 'No tabId set for sendCommand');
      }
      chrome.debugger.sendCommand({tabId: this._tabId}, command, params, result => {
        if (chrome.runtime.lastError) {
          log.log('error', 'method <= browser', command, result);
          return reject(chrome.runtime.lastError);
        }

        if (result.wasThrown) {
          log.log('error', 'method <= browser', command, result);
          return reject(result.exceptionDetails);
        }

        log.log('method <= browser OK', command, result);
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

        this.url = tabs[0].url;
        resolve(tabs[0].id);
      });
    });
  }

  getCurrentTabURL() {
    if (this.url === undefined || this.url === null) {
      return this.queryCurrentTab_().then(_ => this.url);
    }

    return Promise.resolve(this.url);
  }

  attachDebugger_(tabId) {
    return new Promise((resolve, reject) => {
      chrome.debugger.attach({tabId}, '1.1', _ => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        this._debuggerConnected = true;
        resolve(tabId);
      });
    });
  }

  detachDebugger_(tabId) {
    return new Promise((resolve, reject) => {
      chrome.debugger.detach({tabId}, _ => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

        resolve(tabId);
      });
    });
  }

  handleUnexpectedDetach() {
    chrome.debugger.onDetach.addListener((debuggee, detachReason) => {
      this._debuggerConnected = false;
      throw new Error('Lighthouse detached from browser: ' + detachReason);
    });
  }

  off(eventName, cb) {
    if (typeof this._listeners[eventName] === 'undefined') {
      console.warn(`Unable to remove listener ${eventName}; no such listener found.`);
      return;
    }

    const callbackIndex = this._listeners[eventName].indexOf(cb);
    if (callbackIndex === -1) {
      return;
    }

    this._listeners[eventName].splice(callbackIndex, 1);
  }
}

module.exports = ExtensionDriver;
