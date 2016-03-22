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

/* globals chrome */

class ExtensionProtocol {

  constructor() {
    this.listeners_ = {};
    this.tabId_ = null;
    this.url_ = null;
    chrome.debugger.onEvent.addListener(this.onEvent_.bind(this));
  }

  get url() {
    return this.url_;
  }

  set url(url_) {
    this.url_ = url_;
  }

  connect() {
    return this.queryCurrentTab_()
      .then(tabId => {
        this.tabId_ = tabId;
        return this.attachDebugger_(tabId);
      });
  }

  disconnect() {
    if (this.tabId_ === null) {
      return;
    }

    this.detachDebugger_(this.tabId_)
        .then(_ => {
          this.tabId_ = null;
          this.url = null;
        });
  }

  on(eventName, cb) {
    if (typeof this.listeners_[eventName] === 'undefined') {
      this.listeners_[eventName] = [];
    }

    this.listeners_[eventName].push(cb);
  }

  onEvent_(source, method, params) {
    if (typeof this.listeners_[method] === 'undefined') {
      return;
    }

    this.listeners_[method].forEach(cb => {
      cb(params);
    });

    // Reset the listeners;
    this.listeners_[method].length = 0;
  }

  sendCommand(command, params) {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({tabId: this.tabId_}, command, params, result => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

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

  attachDebugger_(tabId) {
    return new Promise((resolve, reject) => {
      chrome.debugger.attach({tabId}, '1.1', _ => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

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
}

module.exports = ExtensionProtocol;
