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

const log = require('../../lib/log.js');

class Driver {

  constructor() {
    this.PAUSE_AFTER_LOAD = 500;
    this._traceEvents = [];
    this._traceCategories = Driver.traceCategories;
    this._eventEmitter = null;
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
      // 'disabled-by-default-v8.cpu_profile',  // these would include JS stack samples, but
      // 'disabled-by-default-v8.cpu_profile.hires', // will take the trace from 5MB -> 100MB
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
   * A simple formatting utility for event logging.
   * @param {string} prefix
   * @param {!Object} data A JSON-serializable object of event data to log.
   * @param {string=} level Optional logging level. Defaults to 'log'.
   */
  formattedLog(prefix, data, level) {
    const columns = (!process || process.browser) ? Infinity : process.stdout.columns;
    const maxLength = columns - data.method.length - prefix.length - 18;
    // IO.read blacklisted here to avoid logging megabytes of trace data
    const snippet = (data.params && data.method !== 'IO.read') ?
        JSON.stringify(data.params).substr(0, maxLength) : '';
    log[level ? level : 'log'](prefix, data.method, snippet);
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
   * @param {!string} eventName
   * @param {function(...)} cb
   */
  on(eventName, cb) {
    if (this._eventEmitter === null) {
      throw new Error('connect() must be called before attempting to listen to events.');
    }

    // log event listeners being bound
    this.formattedLog('listen for event =>', {method: eventName}, 'verbose');
    this._eventEmitter.on(eventName, cb);
  }

  /**
   * Bind a one-time listener for protocol events. Listener is removed once it
   * has been called.
   * @param {!string} eventName
   * @param {function(...)} cb
   */
  once(eventName, cb) {
    if (this._eventEmitter === null) {
      throw new Error('connect() must be called before attempting to listen to events.');
    }
    // log event listeners being bound
    this.formattedLog('listen once for event =>', {method: eventName}, 'verbose');
    this._eventEmitter.once(eventName, cb);
  }

  /**
   * Unbind event listeners
   * @param {!string} eventName
   * @param {function(...)} cb
   */
  off(eventName, cb) {
    if (this._eventEmitter === null) {
      throw new Error('connect() must be called before attempting to remove an event listener.');
    }

    this._eventEmitter.removeListener(eventName, cb);
  }

  /**
   * Call protocol methods
   * @return {!Promise}
   */
  sendCommand() {
    return Promise.reject(new Error('Not implemented'));
  }

  evaluateScriptOnLoad(scriptSource) {
    return this.sendCommand('Page.addScriptToEvaluateOnLoad', {
      scriptSource
    });
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

  /**
   * If our main document URL redirects, we will update options.url accordingly
   * As such, options.url will always represent the post-redirected URL.
   * options.initialUrl is the pre-redirect URL that things started with
   */
  enableUrlUpdateIfRedirected(opts) {
    this._networkRecorder.on('requestloaded', redirectRequest => {
      // Quit if this is not a redirected request
      if (!redirectRequest.redirectSource) {
        return;
      }
      const earlierRequest = redirectRequest.redirectSource;
      if (earlierRequest.url === opts.url) {
        opts.url = redirectRequest.url;
      }
    });
  }

  /**
   * Navigate to the given URL. Use of this method directly isn't advised: if
   * the current page is already at the given URL, navigation will not occur and
   * so the returned promise will never resolve. See https://github.com/GoogleChrome/lighthouse/pull/185
   * for one possible workaround.
   * @param {string} url
   * @param {!Object} options
   * @return {!Promise}
   */
  gotoURL(url, options) {
    const waitForLoad = (options && options.waitForLoad) || false;
    const disableJavaScript = (options && options.disableJavaScript) || false;
    return this.sendCommand('Page.enable')
    .then(_ => this.sendCommand('Emulation.setScriptExecutionDisabled', {value: disableJavaScript}))
    .then(_ => this.sendCommand('Page.navigate', {url}))
    .then(_ => {
      return new Promise((resolve, reject) => {
        this.url = url;

        if (!waitForLoad) {
          return resolve();
        }

        this.once('Page.loadEventFired', response => {
          setTimeout(_ => {
            resolve(response);
          }, this.PAUSE_AFTER_LOAD);
        });
      });
    });
  }

  reloadForCleanStateIfNeeded() {
    return Promise.resolve();
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
      this.once('Tracing.tracingComplete', streamHandle => {
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

  beginNetworkCollect(opts) {
    return new Promise((resolve, reject) => {
      this._networkRecords = [];
      this._networkRecorder = new NetworkRecorder(this._networkRecords);
      this.enableUrlUpdateIfRedirected(opts);

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

  /**
   * Emulate internet disconnection.
   * @return {!Promise}
   */
  goOffline() {
    return this.sendCommand('Network.enable').then(_ => emulation.goOffline(this));
  }

  /**
   * Enable internet connection, using emulated mobile settings if
   * `options.flags.mobile` is true.
   * @param {!Object} options
   * @return {!Promise}
   */
  goOnline(options) {
    return this.sendCommand('Network.enable').then(_ => {
      if (options.flags.mobile) {
        return emulation.enableNetworkThrottling(this);
      }

      return emulation.disableNetworkThrottling(this);
    });
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

module.exports = Driver;

