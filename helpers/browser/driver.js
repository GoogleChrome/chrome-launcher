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

const chromeRemoteInterface = require('chrome-remote-interface');
const NetworkRecorder = require('../network-recorder');

class ChromeProtocol {

  get WAIT_FOR_LOAD() {
    return true;
  }

  constructor() {
    this._url = null;
    this._chrome = null;
    this._traceEvents = [];
    this._traceCategories = [
      '-*', // exclude default
      'toplevel',
      'blink.console',
      'blink.user_timing',
      'devtools.timeline',
      'disabled-by-default-devtools.timeline',
      'disabled-by-default-devtools.timeline.frame',
      'disabled-by-default-devtools.timeline.stack',
      'disabled-by-default-devtools.screenshot',
      'disabled-by-default-v8.cpu_profile'
    ];

    this.timeoutID = null;
  }

  get url() {
    return this._url;
  }

  set url(_url) {
    this._url = _url;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this._chrome) {
        return resolve(this._chrome);
      }

      chromeRemoteInterface({}, chrome => {
        this._chrome = chrome;
        resolve(chrome);
      }).on('error', e => reject(e));
    });
  }

  disconnect() {
    if (this._chrome === null) {
      return;
    }

    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
      this.timeoutID = null;
    }

    this._chrome.close();
    this._chrome = null;
    this.url = null;
  }

  on(eventName, cb) {
    if (this._chrome === null) {
      return;
    }

    this._chrome.on(eventName, cb);
  }

  sendCommand(command, params) {
    return new Promise((resolve, reject) => {
      this._chrome.send(command, params, (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result);
      });
    });
  }

  gotoURL(url, waitForLoad) {
    return new Promise((resolve, reject) => {
      this._chrome.Page.enable();
      this._chrome.Page.navigate({url}, (err, response) => {
        if (err) {
          reject(err);
        }

        this.url = url;

        if (waitForLoad) {
          this._chrome.Page.loadEventFired(_ => {
            resolve(response);
          });
        } else {
          resolve(response);
        }
      });
    });
  }

  _resetFailureTimeout(reject) {
    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
      this.timeoutID = null;
    }

    this.timeoutID = setTimeout(_ => {
      this.disconnect();
      reject(new Error('Trace retrieval timed out'));
    }, 15000);
  }

  beginTrace() {
    this._traceEvents = [];

    return this.connect().then(chrome => {
      chrome.Page.enable();
      chrome.Tracing.start({
        categories: this._traceCategories.join(','),
        options: 'sampling-frequency=10000'  // 1000 is default and too slow.
      });

      chrome.Tracing.dataCollected(data => {
        this._traceEvents.push(...data.value);
      });

      return true;
    });
  }

  endTrace() {
    return this.connect().then(chrome => {
      return new Promise((resolve, reject) => {
        chrome.Tracing.end();
        this._resetFailureTimeout(reject);

        chrome.Tracing.tracingComplete(_ => {
          resolve(this._traceEvents);
        });
      });
    });
  }

  beginNetworkCollect() {
    return this.connect().then(chrome => {
      return new Promise((resolve, reject) => {
        this._networkRecords = [];
        this._networkRecorder = new NetworkRecorder(this._networkRecords);

        chrome.on('Network.requestWillBeSent',
            this._networkRecorder.onRequestWillBeSent);
        chrome.on('Network.requestServedFromCache',
            this._networkRecorder.onRequestServedFromCache);
        chrome.on('Network.responseReceived',
            this._networkRecorder.onResponseReceived);
        chrome.on('Network.dataReceived',
            this._networkRecorder.onDataReceived);
        chrome.on('Network.loadingFinished',
            this._networkRecorder.onLoadingFinished);
        chrome.on('Network.loadingFailed',
            this._networkRecorder.onLoadingFailed);

        chrome.Network.enable();
        chrome.once('ready', _ => {
          resolve();
        });
      });
    });
  }

  endNetworkCollect() {
    return this.connect().then(chrome => {
      return new Promise((resolve, reject) => {
        chrome.removeListener('Network.requestWillBeSent',
            this._networkRecorder.onRequestWillBeSent);
        chrome.removeListener('Network.requestServedFromCache',
            this._networkRecorder.onRequestServedFromCache);
        chrome.removeListener('Network.responseReceived',
            this._networkRecorder.onResponseReceived);
        chrome.removeListener('Network.dataReceived',
            this._networkRecorder.onDataReceived);
        chrome.removeListener('Network.loadingFinished',
            this._networkRecorder.onLoadingFinished);
        chrome.removeListener('Network.loadingFailed',
            this._networkRecorder.onLoadingFailed);

        chrome.Network.disable();
        chrome.once('ready', _ => {
          resolve(this._networkRecords);
          this._networkRecorder = null;
          this._networkRecords = [];
        });
      });
    });
  }
}

module.exports = ChromeProtocol;
