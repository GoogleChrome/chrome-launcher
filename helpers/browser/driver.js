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
const log = require('npmlog');


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

      chromeRemoteInterface({ port: 9222 }, chrome => {
        this._chrome = chrome;
        this.beginLogging();
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


  beginLogging() {
    if (true) {
      // log all events received
      this._chrome.on('event', req => _logSnippet('verbose', '<=', req));
    }
  }

  on(eventName, cb) {
    if (this._chrome === null) {
      throw new Error('Trying to call on() but no cri instance available yet');
    }
    if (true) {
      // event listeners being bound
      _logSnippet('info', 'event => browser', {method: eventName});
    }
    this._chrome.on(eventName, cb);
  }

  sendCommand(command, params) {
    return new Promise((resolve, reject) => {
      if (true) {
        _logSnippet('info', 'method => browser', {method: command, params: params});
      }
      this._chrome.send(command, params, (err, result) => {
        if (err) {
          return reject(err);
        }

        resolve(result);
      });
    });
  }

  gotoURL(url, waitForLoad) {
    var sendCommand = this.sendCommand.bind(this);

    return new Promise((resolve, reject) => {
      sendCommand('Page.enable')
        .then(sendCommand('Page.navigate', {url}))
        .then((err, response) => {
          if (err) {
            reject(err);
          }

          this.url = url;

          if (!waitForLoad) {
            resolve(response);
          } else {
            sendCommand('Page.loadEventFired').then((err, response) => {
              resolve(response);
            });
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

function _logSnippet(level, prefix, data) {
  const columns = (typeof process === 'undefined') ? Infinity : process.stdout.columns;
  const maxLength = columns - data.method.length - prefix.length - 7;
  const snippet = data.params ? JSON.stringify(data.params).substr(0, maxLength) : '';
  log[level](prefix, data.method, snippet);
}

module.exports = ChromeProtocol;
