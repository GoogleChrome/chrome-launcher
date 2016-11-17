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

const NetworkRecorder = require('../lib/network-recorder');
const emulation = require('../lib/emulation');
const Element = require('../lib/element');
const EventEmitter = require('events').EventEmitter;
const parseURL = require('url').parse;

const log = require('../lib/log.js');

const MAX_WAIT_FOR_FULLY_LOADED = 25 * 1000;
const PAUSE_AFTER_LOAD = 500;

class Driver {

  /**
   * @param {!Connection} connection
   */
  constructor(connection) {
    this._traceEvents = [];
    this._traceCategories = Driver.traceCategories;
    this._eventEmitter = new EventEmitter();
    this._connection = connection;
    connection.on('notification', event => this._eventEmitter.emit(event.method, event.params));
  }

  static get traceCategories() {
    return [
      '-*', // exclude default
      'toplevel',
      'blink.console',
      'blink.user_timing',
      'benchmark',
      'netlog',
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

  /**
   * @return {!Promise<null>}
   */
  connect() {
    return this._connection.connect();
  }

  disconnect() {
    return this._connection.disconnect();
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
    log.formatProtocol('listen for event =>', {method: eventName}, 'verbose');
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
    log.formatProtocol('listen once for event =>', {method: eventName}, 'verbose');
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
   * @param {!string} method
   * @param {!Object} params
   * @return {!Promise}
   */
  sendCommand(method, params) {
    return this._connection.sendCommand(method, params);
  }

  evaluateScriptOnLoad(scriptSource) {
    return this.sendCommand('Page.addScriptToEvaluateOnLoad', {
      scriptSource
    });
  }

  /**
   * Evaluate an expression in the context of the current page. Expression must
   * evaluate to a Promise. Returns a promise that resolves on asyncExpression's
   * resolved value.
   * @param {string} asyncExpression
   * @return {!Promise<*>}
   */
  evaluateAsync(asyncExpression) {
    return new Promise((resolve, reject) => {
      // If this gets to 60s and it hasn't been resolved, reject the Promise.
      const asyncTimeout = setTimeout(
        (_ => reject(new Error('The asynchronous expression exceeded the allotted time of 60s'))),
        60000
      );
      this.sendCommand('Runtime.evaluate', {
        expression: asyncExpression,
        includeCommandLineAPI: true,
        awaitPromise: true,
        returnByValue: true
      }).then(result => {
        clearTimeout(asyncTimeout);
        resolve(result.result.value);
      }).catch(reject);
    });
  }

  getSecurityState() {
    return new Promise((resolve, reject) => {
      this.once('Security.securityStateChanged', data => {
        this.sendCommand('Security.disable')
          .then(_ => resolve(data), reject);
      });

      this.sendCommand('Security.enable').catch(reject);
    });
  }

  getServiceWorkerVersions() {
    return new Promise((resolve, reject) => {
      this.once('ServiceWorker.workerVersionUpdated', data => {
        this.sendCommand('ServiceWorker.disable')
          .then(_ => resolve(data), reject);
      });

      this.sendCommand('ServiceWorker.enable').catch(reject);
    });
  }

  getServiceWorkerRegistrations() {
    return new Promise((resolve, reject) => {
      this.once('ServiceWorker.workerRegistrationUpdated', data => {
        this.sendCommand('ServiceWorker.disable')
          .then(_ => resolve(data), reject);
      });

      this.sendCommand('ServiceWorker.enable').catch(reject);
    });
  }

  /**
   * Rejects if any open tabs would share a service worker with the target URL.
   * This includes the target tab, so navigation to something like about:blank
   * should be done before calling.
   * @param {!string} pageUrl
   * @return {!Promise}
   */
  assertNoSameOriginServiceWorkerClients(pageUrl) {
    let registrations;
    let versions;
    return this.getServiceWorkerRegistrations().then(data => {
      registrations = data.registrations;
    }).then(_ => this.getServiceWorkerVersions()).then(data => {
      versions = data.versions;
    }).then(_ => {
      const parsedURL = parseURL(pageUrl);
      const origin = `${parsedURL.protocol}//${parsedURL.hostname}` +
          (parsedURL.port ? `:${parsedURL.port}` : '');

      registrations
        .filter(reg => {
          const parsedURL = parseURL(reg.scopeURL);
          const swOrigin = `${parsedURL.protocol}//${parsedURL.hostname}` +
              (parsedURL.port ? `:${parsedURL.port}` : '');

          return origin === swOrigin;
        })
        .forEach(reg => {
          versions.forEach(ver => {
            // Ignore workers unaffiliated with this registration
            if (ver.registrationId !== reg.registrationId) {
              return;
            }

            // Throw if service worker for this origin has active controlledClients.
            if (ver.controlledClients && ver.controlledClients.length > 0) {
              throw new Error('You probably have multiple tabs open to the same origin.');
            }
          });
        });
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
   * Returns a promise that resolves when the network has been idle for
   * `pauseAfterLoadMs` ms and a method to cancel internal network listeners and
   * timeout.
   * @param {string} pauseAfterLoadMs
   * @return {{promise: !Promise, cancel: function()}}
   * @private
   */
  _waitForNetworkIdle(pauseAfterLoadMs) {
    let idleTimeout;
    let cancel;

    const promise = new Promise((resolve, reject) => {
      const onIdle = () => {
        // eslint-disable-next-line no-use-before-define
        this._networkRecorder.once('networkbusy', onBusy);
        idleTimeout = setTimeout(_ => {
          cancel();
          resolve();
        }, pauseAfterLoadMs);
      };

      const onBusy = () => {
        this._networkRecorder.once('networkidle', onIdle);
        clearTimeout(idleTimeout);
      };

      cancel = () => {
        clearTimeout(idleTimeout);
        this._networkRecorder.removeListener('networkbusy', onBusy);
        this._networkRecorder.removeListener('networkidle', onIdle);
      };

      if (this._networkRecorder.isIdle()) {
        onIdle();
      } else {
        onBusy();
      }
    });

    return {
      promise,
      cancel
    };
  }

  /**
   * Return a promise that resolves `pauseAfterLoadMs` after the load event
   * fires and a method to cancel internal listeners and timeout.
   * @param {number} pauseAfterLoadMs
   * @return {{promise: !Promise, cancel: function()}}
   * @private
   */
  _waitForLoadEvent(pauseAfterLoadMs) {
    let loadListener;
    let loadTimeout;

    const promise = new Promise((resolve, reject) => {
      loadListener = function() {
        loadTimeout = setTimeout(resolve, pauseAfterLoadMs);
      };
      this.once('Page.loadEventFired', loadListener);
    });
    const cancel = () => {
      this.off('Page.loadEventFired', loadListener);
      clearTimeout(loadTimeout);
    };

    return {
      promise,
      cancel
    };
  }

  /**
   * Returns a promise that resolves when:
   * - it's been pauseAfterLoadMs milliseconds after both onload and the network
   * has gone idle, or
   * - MAX_WAIT_FOR_FULLY_LOADED milliseconds have passed.
   * See https://github.com/GoogleChrome/lighthouse/issues/627 for more.
   * @param {number} pauseAfterLoadMs
   * @return {!Promise}
   * @private
   */
  _waitForFullyLoaded(pauseAfterLoadMs) {
    let maxTimeoutHandle;

    // Listener for onload. Resolves pauseAfterLoadMs ms after load.
    const waitForLoadEvent = this._waitForLoadEvent(pauseAfterLoadMs);
    // Network listener. Resolves when the network has been idle for pauseAfterLoadMs.
    const waitForNetworkIdle = this._waitForNetworkIdle(pauseAfterLoadMs);

    // Wait for both load promises. Resolves on cleanup function the clears load
    // timeout timer.
    const loadPromise = Promise.all([
      waitForLoadEvent.promise,
      waitForNetworkIdle.promise
    ]).then(_ => {
      return function() {
        log.verbose('Driver', 'loadEventFired and network considered idle');
        clearTimeout(maxTimeoutHandle);
      };
    });

    // Last resort timeout. Resolves MAX_WAIT_FOR_FULLY_LOADED ms from now on
    // cleanup function that removes loadEvent and network idle listeners.
    const maxTimeoutPromise = new Promise((resolve, reject) => {
      maxTimeoutHandle = setTimeout(resolve, MAX_WAIT_FOR_FULLY_LOADED);
    }).then(_ => {
      return function() {
        log.warn('Driver', 'Timed out waiting for page load. Moving on...');
        waitForLoadEvent.cancel();
        waitForNetworkIdle.cancel();
      };
    });

    // Wait for load or timeout and run the cleanup function the winner returns.
    return Promise.race([
      loadPromise,
      maxTimeoutPromise
    ]).then(cleanup => cleanup());
  }

  /**
   * Navigate to the given URL. Use of this method directly isn't advised: if
   * the current page is already at the given URL, navigation will not occur and
   * so the returned promise will only resolve after the MAX_WAIT_FOR_FULLY_LOADED
   * timeout. See https://github.com/GoogleChrome/lighthouse/pull/185 for one
   * possible workaround.
   * @param {string} url
   * @param {!Object} options
   * @return {!Promise}
   */
  gotoURL(url, options) {
    const _options = options || {};
    const waitForLoad = _options.waitForLoad || false;
    const disableJS = _options.disableJavaScript || false;
    const pauseAfterLoadMs = (_options.flags && _options.flags.pauseAfterLoad) || PAUSE_AFTER_LOAD;

    return this.sendCommand('Page.enable')
      .then(_ => this.sendCommand('Emulation.setScriptExecutionDisabled', {value: disableJS}))
      .then(_ => this.sendCommand('Page.navigate', {url}))
      .then(_ => waitForLoad && this._waitForFullyLoaded(pauseAfterLoadMs));
  }

  /**
  * @param {string} objectId Object ID for the resolved DOM node
  * @param {string} propName Name of the property
  * @return {!Promise<String>} The property value, or null, if property not found
  */
  getObjectProperty(objectId, propName) {
    return new Promise((resolve, reject) => {
      this.sendCommand('Runtime.getProperties', {
        objectId,
        accessorPropertiesOnly: true,
        generatePreview: false,
        ownProperties: false,
      })
      .then(properties => {
        const propertyForName = properties.result
          .find(property => property.name === propName);

        if (propertyForName) {
          resolve(propertyForName.value.value);
        } else {
          reject(null);
        }
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

  /**
   * @param {string} selector Selector to find in the DOM
   * @return {!Promise<Element[]>} The found elements, or [], resolved in a promise
   */
  querySelectorAll(selector) {
    return this.sendCommand('DOM.getDocument')
      .then(result => result.root.nodeId)
      .then(nodeId => this.sendCommand('DOM.querySelectorAll', {
        nodeId,
        selector
      }))
      .then(nodeList => {
        const elementList = [];
        nodeList.nodeIds.forEach(nodeId => {
          if (nodeId !== 0) {
            elementList.push(new Element({nodeId}, this));
          }
        });
        return elementList;
      });
  }

  beginTrace() {
    const tracingOpts = {
      categories: this._traceCategories.join(','),
      transferMode: 'ReturnAsStream',
      options: 'sampling-frequency=10000'  // 1000 is default and too slow.
    };

    // Disable any domains that could interfere or add overhead to the trace
    return this.sendCommand('Debugger.disable')
      .then(_ => this.sendCommand('CSS.disable'))
      .then(_ => {
        return this.sendCommand('DOM.disable')
          // If it wasn't already enabled, it will throw; ignore these. See #861
          .catch(_ => {});
      })
      // Enable Page domain to wait for Page.loadEventFired
      .then(_ => this.sendCommand('Page.enable'))
      .then(_ => this.sendCommand('Tracing.start', tracingOpts));
  }

  endTrace() {
    return new Promise((resolve, reject) => {
      // When the tracing has ended this will fire with a stream handle.
      this.once('Tracing.tracingComplete', streamHandle => {
        this._readTraceFromStream(streamHandle)
            .then(traceContents => resolve(traceContents), reject);
      });

      // Issue the command to stop tracing.
      this.sendCommand('Tracing.end').catch(reject);
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

      this.sendCommand('IO.read', readArguments).then(onChunkRead).catch(reject);
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

      this.sendCommand('Network.enable').then(resolve, reject);
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

  enableRuntimeEvents() {
    return this.sendCommand('Runtime.enable');
  }

  beginEmulation(flags) {
    const emulations = [];

    if (!flags.disableDeviceEmulation) {
      emulations.push(emulation.enableNexus5X(this));
    }

    if (!flags.disableNetworkThrottling) {
      emulations.push(emulation.enableNetworkThrottling(this));
    }

    if (!flags.disableCpuThrottling) {
      emulations.push(emulation.enableCPUThrottling(this));
    }

    return Promise.all(emulations);
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
   * `options.flags.disableNetworkThrottling` is false.
   * @param {!Object} options
   * @return {!Promise}
   */
  goOnline(options) {
    return this.sendCommand('Network.enable').then(_ => {
      if (!options.flags.disableNetworkThrottling) {
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

  clearDataForOrigin(url) {
    const parsedURL = parseURL(url);
    const origin = `${parsedURL.protocol}//${parsedURL.hostname}` +
      (parsedURL.port ? `:${parsedURL.port}` : '');

    // Clear all types of storage except cookies, so the user isn't logged out.
    //   https://chromedevtools.github.io/debugger-protocol-viewer/tot/Storage/#type-StorageType
    const typesToClear = [
      'appcache',
      // 'cookies',
      'file_systems',
      'indexeddb',
      'local_storage',
      'shader_cache',
      'websql',
      'service_workers',
      'cache_storage'
    ].join(',');

    return this.sendCommand('Storage.clearDataForOrigin', {
      origin: origin,
      storageTypes: typesToClear
    });
  }

  /**
   * Keeps track of calls to a JS function and returns a list of {url, line, col}
   * of the usage. Should be called before page load (in beforePass).
   * @param {string} funcName The function name to track ('Date.now', 'console.time').
   * @return {function(): !Promise<!Array<{url: string, line: number, col: number}>>}
   *     Call this method when you want results.
   */
  captureFunctionCallSites(funcName) {
    const globalVarToPopulate = `window['__${funcName}StackTraces']`;
    const collectUsage = () => {
      return this.evaluateAsync(
          `Promise.resolve(Array.from(${globalVarToPopulate}).map(item => JSON.parse(item)))`);
    };

    const funcBody = captureJSCallUsage.toString();

    this.evaluateScriptOnLoad(`
        ${globalVarToPopulate} = new Set();
        (${funcName} = ${funcBody}(${funcName}, ${globalVarToPopulate}))`);

    return collectUsage;
  }
}

/**
 * Tracks function call usage. Used by captureJSCalls to inject code into the page.
 * @param {function(...*): *} funcRef The function call to track.
 * @param {!Set} set An empty set to populate with stack traces. Should be
 *     on the global object.
 * @return {function(...*): *} A wrapper around the original function.
 */
function captureJSCallUsage(funcRef, set) {
  const originalFunc = funcRef;
  const originalPrepareStackTrace = Error.prepareStackTrace;

  return function() {
    // Note: this function runs in the context of the page that is being audited.

    const args = [...arguments]; // callee's arguments.

    // See v8's Stack Trace API https://github.com/v8/v8/wiki/Stack-Trace-API#customizing-stack-traces
    Error.prepareStackTrace = function(error, structStackTrace) {
      // First frame is the function we injected (the one that just threw).
      // Second, is the actual callsite of the funcRef we're after.
      const callFrame = structStackTrace[1];
      const file = callFrame.getFileName();
      const line = callFrame.getLineNumber();
      const col = callFrame.getColumnNumber();
      // TODO: add back when we want stack traces. See https://github.com/GoogleChrome/lighthouse/issues/957
      // const stackTrace = structStackTrace.slice(1).map(
      //    callsite => callsite.toString());
      return {url: file, args, line, col}; // return value is e.stack
    };
    const e = new Error(`__called ${funcRef.name}__`);
    set.add(JSON.stringify(e.stack));

    // Restore prepareStackTrace so future errors use v8's formatter and not
    // our custom one.
    Error.prepareStackTrace = originalPrepareStackTrace;

    return originalFunc.apply(this, arguments);
  };
}

module.exports = Driver;
