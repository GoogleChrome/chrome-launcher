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

const NetworkRecorder = require('../../lib/network-recorder');
const emulation = require('../../lib/emulation');
const Element = require('../../lib/element');

class DriverBase {

  constructor() {
    this._url = null;
    this.PAUSE_AFTER_LOAD = 500;
    this._chrome = null;
    this._traceEvents = [];
    this._traceCategories = DriverBase.traceCategories;
  }

  get url() {
    return this._url;
  }

  set url(_url) {
    this._url = _url;
  }

  static get traceCategories() {
    return [
      '-*', // exclude default
      'toplevel',
      'blink.console',
      'blink.user_timing',
      'benchmark',
      'devtools.timeline',
      'disabled-by-default-blink.debug.layout',
      'disabled-by-default-devtools.timeline',
      'disabled-by-default-devtools.timeline.frame',
      'disabled-by-default-devtools.timeline.stack',
      'disabled-by-default-devtools.screenshot'
    ];
  }

  enableRuntimeEvents() {
    return this.sendCommand('Runtime.enable');
  }

  enableSecurityEvents() {
    return this.sendCommand('Security.enable');
  }

  /**
   * @return {!Promise<null>}
   */
  connect() {
    return Promise.reject(new Error('Not implemented'));
  }

  disconnect() {
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Bind listeners for protocol events
   */
  on() {
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Bind a one-time listener for protocol events. Listener is removed once it
   * has been called.
   */
  once() {
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Unbind event listeners
   */
  off() {
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Call protocol methods
   * @return {!Promise}
   */
  sendCommand() {
    return Promise.reject(new Error('Not implemented'));
  }

  evaluateAsync(asyncExpression) {
    return new Promise((resolve, reject) => {
      let asyncTimeout;

      // Inject the call to capture inspection.
      const expression = `(function() {
        const __inspect = inspect;
        const __returnResults = function(results) {
          __inspect(JSON.stringify(results));
        };
        ${asyncExpression}
      })()`;

      const inspectHandler = value => {
        if (asyncTimeout !== undefined) {
          clearTimeout(asyncTimeout);
        }

        // If the returned object doesn't meet the expected pattern, bail with an undefined.
        if (value === undefined ||
            value.object === undefined ||
            value.object.value === undefined) {
          return resolve();
        }

        return resolve(JSON.parse(value.object.value));
      };

      // COMPAT: Chrome 52 is when Runtime.inspectRequested became available
      //   https://codereview.chromium.org/1866213002
      // Previously, a similar-looking Inspector.inspect event was available, but unfortunately
      // it will not fire in this scenario.
      this.once('Runtime.inspectRequested', inspectHandler);

      this.sendCommand('Runtime.evaluate', {
        expression,
        includeCommandLineAPI: true
      });

      // If this gets to 60s and it hasn't been resolved, reject the Promise.
      asyncTimeout = setTimeout(
        (_ => reject(new Error('The asynchronous expression exceeded the allotted time of 60s'))),
        60000
      );
    });
  }

  getSecurityState() {
    return new Promise((resolve, reject) => {
      this.once('Security.securityStateChanged', data => {
        this.sendCommand('Security.disable');
        resolve(data);
      });

      this.sendCommand('Security.enable');
    });
  }

  getServiceWorkerVersions() {
    return new Promise((resolve, reject) => {
      this.once('ServiceWorker.workerVersionUpdated', data => {
        this.sendCommand('ServiceWorker.disable');
        resolve(data);
      });

      this.sendCommand('ServiceWorker.enable');
    });
  }

  gotoURL(url, options) {
    const waitForLoad = (options && options.waitForLoad) || false;
    const disableJavaScript = (options && options.disableJavaScript) || false;
    return this.sendCommand('Page.enable')
    .then(_ => this.sendCommand('Emulation.setScriptExecutionDisabled', {value: disableJavaScript}))
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
    }).then(_ => {
      return new Promise((resolve, reject) => {
        this.url = url;

        if (!waitForLoad) {
          return resolve();
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
      // COMPAT: We've found `result` not retaining its value in this scenario when it's
      // declared with `let`. Observed in Chrome 50 and 52. While investigating the V8 bug
      // further, we'll use a plain `var` declaration.
      var isEOF = false;
      var result = '';

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
          return resolve(JSON.parse(result));
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
      this.on('Network.resourceChangedPriority', this._networkRecorder.onResourceChangedPriority);

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
      this.off('Network.resourceChangedPriority', this._networkRecorder.onResourceChangedPriority);

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
    // COMPAT: This command will trigger this registrationId error in Chrome 50 (51 undetermined):
    //   "{"code":-32602,"message":"Missing or invalid 'registrationId' parameter"}"
    return this.sendCommand('ServiceWorker.setForceUpdateOnPageLoad', {
      forceUpdateOnPageLoad: true
    });
  }
}

module.exports = DriverBase;

