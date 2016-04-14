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
const emulation = require('../emulation');
const Element = require('../element.js');
const port = process.env.PORT || 9222;

const log = (typeof process !== 'undefined' && 'version' in process) ?
    require('npmlog').log : console.log.bind(console);

class ChromeProtocol {

  get WAIT_FOR_LOADED() {
    return true;
  }

  constructor() {
    this._url = null;
    this.PAUSE_AFTER_LOAD = 3000;
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
      'disabled-by-default-devtools.screenshot'
    ];
  }

  get url() {
    return this._url;
  }

  set url(_url) {
    this._url = _url;
  }

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
          resolve();
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
      _log('info', 'method => browser', {method: command, params: params});

      this._chrome.send(command, params, (err, result) => {
        if (err) {
          return reject(result);
        }
        resolve(result);
      });
    });
  }

  gotoURL(url, waitForLoaded) {
    return new Promise((resolve, reject) => {
      Promise.resolve()
      .then(_ => this.sendCommand('Page.enable'))
      .then(_ => this.sendCommand('Page.getNavigationHistory'))
      .then(navHistory => {
        const currentURL = navHistory.entries[navHistory.currentIndex].url;

        // Because you can give https://example.com and the browser will
        // silently redirect to https://example.com/ we need to check the match
        // with a trailing slash on it.
        //
        // If the URL matches then we need to issue a reload not navigate
        // @see https://github.com/GoogleChrome/lighthouse/issues/183
        const shouldReload = (currentURL === url || currentURL === url + '/');
        if (shouldReload) {
          return this.sendCommand('Page.reload', {ignoreCache: true});
        }

        return this.sendCommand('Page.navigate', {url});
      })
      .then(response => {
        this.url = url;

        if (!waitForLoaded) {
          return resolve(response);
        }
        this.on('Page.loadEventFired', response => {
          setTimeout(_ => {
            resolve(response);
          }, this.PAUSE_AFTER_LOAD);
        });
      });
    });
  }

  /**
   * @param {string} selector Selector to find in the DOM
   * @return {!Promise<Element>} The found element, or null, resolved in a promise
   */
  querySelector(selector) {
    return this.sendCommand('DOM.getDocument')
      .then(result => result.root.nodeId)
      .then(nodeId => this.sendCommand('DOM.querySelector', {
        nodeId,
        selector
      }))
      .then(element => {
        if (element.nodeId === 0) {
          return null;
        }
        return new Element(element, this);
      });
  }

  beginTrace() {
    const tracingOpts = {
      categories: this._traceCategories.join(','),
      transferMode: 'ReturnAsStream',
      options: 'sampling-frequency=10000'  // 1000 is default and too slow.
    };

    return this.sendCommand('Page.enable')
      .then(_ => this.sendCommand('Tracing.start', tracingOpts));
  }

  endTrace() {
    return new Promise((resolve, reject) => {
      // When the tracing has ended this will fire with a stream handle.
      this.on('Tracing.tracingComplete', streamHandle => {
        this._readTraceFromStream(streamHandle)
            .then(traceContents => resolve(traceContents));
      });

      // Issue the command to stop tracing.
      this.sendCommand('Tracing.end');
    });
  }

  _readTraceFromStream(streamHandle) {
    return new Promise((resolve, reject) => {
      // With our stream we can read a bunch, and if its taking too long,
      // take a break to the next event cycle and then go again.
      let isEOF = false;
      let result = '';

      const readArguments = {
        handle: streamHandle.stream
      };

      const onChunkRead = response => {
        if (isEOF) {
          return;
        }

        result += response.data;

        if (response.eof) {
          isEOF = true;
          resolve(JSON.parse(result));
        }

        return this.sendCommand('IO.read', readArguments).then(onChunkRead);
      };

      this.sendCommand('IO.read', readArguments).then(onChunkRead);
    });
  }

  beginNetworkCollect() {
    return new Promise((resolve, reject) => {
      this._networkRecords = [];
      this._networkRecorder = new NetworkRecorder(this._networkRecords);

      this.on('Network.requestWillBeSent', this._networkRecorder.onRequestWillBeSent);
      this.on('Network.requestServedFromCache', this._networkRecorder.onRequestServedFromCache);
      this.on('Network.responseReceived', this._networkRecorder.onResponseReceived);
      this.on('Network.dataReceived', this._networkRecorder.onDataReceived);
      this.on('Network.loadingFinished', this._networkRecorder.onLoadingFinished);
      this.on('Network.loadingFailed', this._networkRecorder.onLoadingFailed);

      this.sendCommand('Network.enable').then(_ => {
        resolve();
      });
    });
  }

  endNetworkCollect() {
    return new Promise((resolve, reject) => {
      this.off('Network.requestWillBeSent', this._networkRecorder.onRequestWillBeSent);
      this.off('Network.requestServedFromCache', this._networkRecorder.onRequestServedFromCache);
      this.off('Network.responseReceived', this._networkRecorder.onResponseReceived);
      this.off('Network.dataReceived', this._networkRecorder.onDataReceived);
      this.off('Network.loadingFinished', this._networkRecorder.onLoadingFinished);
      this.off('Network.loadingFailed', this._networkRecorder.onLoadingFailed);

      resolve(this._networkRecords);
      this._networkRecorder = null;
      this._networkRecords = [];
    });
  }

  beginEmulation() {
    return Promise.all([
      emulation.enableNexus5X(this),
      emulation.enableNetworkThrottling(this)
    ]);
  }

  cleanAndDisableBrowserCaches() {
    return Promise.all([
      this.clearBrowserCache(),
      this.disableBrowserCache()
    ]);
  }

  clearBrowserCache() {
    return this.sendCommand('Network.clearBrowserCache');
  }

  disableBrowserCache() {
    return this.sendCommand('Network.setCacheDisabled', {cacheDisabled: true});
  }

  forceUpdateServiceWorkers() {
    return this.sendCommand('ServiceWorker.setForceUpdateOnPageLoad', {
      forceUpdateOnPageLoad: true
    });
  }
}

function _log(level, prefix, data) {
  const columns = (typeof process === 'undefined') ? Infinity : process.stdout.columns;
  const maxLength = columns - data.method.length - prefix.length - 7;
  const snippet = data.params ? JSON.stringify(data.params).substr(0, maxLength) : '';
  log(level, prefix, data.method, snippet);
}

module.exports = ChromeProtocol;
