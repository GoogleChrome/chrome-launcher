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

var NetworkRecorder = require('../network-recorder');

const EXECUTION_CONTEXT_TIMEOUT = 4000;

class ChromeProtocol {
  constructor(opts) {
    opts = opts || {};

    this.categories = [
      '-*', // exclude default
      'toplevel',
      'blink.console',
      'devtools.timeline',
      'disabled-by-default-devtools.timeline',
      'disabled-by-default-devtools.timeline.frame',
      'disabled-by-default-devtools.timeline.stack',
      'disabled-by-default-devtools.screenshot',
      'disabled-by-default-v8.cpu_profile'
    ];

    this._traceEvents = [];
    this._currentURL = null;
    this._instance = null;
    this._networkRecords = [];
    this._networkRecorder = null;

    this.getPageHTML = this.getPageHTML.bind(this);
    this.evaluateFunction = this.evaluateFunction.bind(this);
    this.evaluateScript = this.evaluateScript.bind(this);
    this.getServiceWorkerRegistrations =
        this.getServiceWorkerRegistrations.bind(this);
    this.beginTrace = this.beginTrace.bind(this);
    this.endTrace = this.endTrace.bind(this);
    this.beginNetworkCollect = this.beginNetworkCollect.bind(this);
    this.endNetworkCollect = this.endNetworkCollect.bind(this);
  }

  get WAIT_FOR_LOAD() {
    return true;
  }

  getInstance() {
    if (!this._instance) {
      this._instance = new Promise((resolve, reject) => {
        // @see: github.com/cyrus-and/chrome-remote-interface#moduleoptions-callback
        const OPTIONS = {};
        chromeRemoteInterface(OPTIONS,
          resolve
        ).on('error', e => reject(e));
      });
    }

    return this._instance;
  }

  resetFailureTimeout(reject) {
    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
    }

    this.timeoutID = setTimeout(_ => {
      // FIXME
      // this.discardTab();
      reject(new Error('Trace retrieval timed out'));
    }, 15000);
  }

  getServiceWorkerRegistrations() {
    return this.getInstance().then(chrome => {
      return new Promise((resolve, reject) => {
        chrome.ServiceWorker.enable();
        chrome.on('ServiceWorker.workerVersionUpdated', data => {
          resolve(data);
        });
      });
    });
  }

  getPageHTML() {
    return this.getInstance().then(chrome => {
      return new Promise((resolve, reject) => {
        chrome.send('DOM.getDocument', null, (docErr, docResult) => {
          if (docErr) {
            return reject(docErr);
          }

          let nodeId = {
            nodeId: docResult.root.nodeId
          };

          chrome.send('DOM.getOuterHTML', nodeId, (htmlErr, htmlResult) => {
            if (htmlErr) {
              return reject(htmlErr);
            }

            resolve(htmlResult.outerHTML);
          });
        });
      });
    });
  }

  static getEvaluationContextFor(chrome, url) {
    return new Promise((resolve, reject) => {
      var errorTimeout = setTimeout((_ =>
        reject(new Error(`Timed out waiting for ${url} execution context`))),
      EXECUTION_CONTEXT_TIMEOUT);

      chrome.Runtime.enable();
      chrome.on('Runtime.executionContextCreated', evalContext => {
        // console.info(`executionContext: "${evalContext.context.origin}"`);
        if (evalContext.context.origin.indexOf(url) !== -1) {
          clearTimeout(errorTimeout);
          resolve(evalContext.context.id);
        }
      });
    });
  }

  evaluateFunction(url, fn) {
    let wrappedScriptStr = '(' + fn.toString() + ')()';
    return this.evaluateScript(url, wrappedScriptStr);
  }

  evaluateScript(url, scriptSrc) {
    return this.getInstance().then(chrome => {
      // Set up executionContext listener before navigation.
      let contextListener = ChromeProtocol.getEvaluationContextFor(chrome, url);

      return this.gotoURL(url, this.WAIT_FOR_LOAD)
        .then(_ => contextListener)
        .then(contextId => new Promise((resolve, reject) => {
          let evalOpts = {
            expression: scriptSrc,
            contextId: contextId
          };
          chrome.Runtime.evaluate(evalOpts, (err, evalResult) => {
            if (err || evalResult.wasThrown) {
              return reject(evalResult);
            }

            let result = evalResult.result;

            chrome.Runtime.getProperties({
              objectId: result.objectId
            }, (err, propsResult) => {
              if (err) {
                /* continue anyway */
              }
              result.props = {};
              if (Array.isArray(propsResult.result)) {
                propsResult.result.forEach(prop => {
                  result.props[prop.name] = prop.value ? prop.value.value :
                      prop.get.description;
                });
              }
              resolve(result);
            });
          });
        }));
    });
  }

  gotoURL(url, waitForLoad) {
    return this.getInstance().then(chrome => {
      return new Promise((resolve, reject) => {
        chrome.Page.enable();
        chrome.Page.navigate({url}, (err, response) => {
          if (err) {
            reject(err);
          }

          if (waitForLoad) {
            chrome.Page.loadEventFired(_ => {
              this._currentURL = url;
              resolve(response);
            });
          } else {
            resolve(response);
          }
        });
      });
    });
  }

  disableCaching() {
    // TODO(paullewis): implement.
    return Promise.resolve();
  }

  beginTrace() {
    this._traceEvents = [];

    return this.getInstance().then(chrome => {
      chrome.Page.enable();
      chrome.Tracing.start({
        categories: this.categories.join(','),
        options: 'sampling-frequency=10000'  // 1000 is default and too slow.
      });

      chrome.Tracing.dataCollected(data => {
        this._traceEvents.push(...data.value);
      });

      return true;
    });
  }

  endTrace() {
    return this.getInstance().then(chrome => {
      return new Promise((resolve, reject) => {
        chrome.Tracing.end();
        this.resetFailureTimeout(reject);

        chrome.Tracing.tracingComplete(_ => {
          resolve(this._traceEvents);
        });
      });
    });
  }

  beginNetworkCollect() {
    return this.getInstance().then(chrome => {
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
    return this.getInstance().then(chrome => {
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
