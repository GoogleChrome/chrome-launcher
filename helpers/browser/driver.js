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

var chromeremoteinterface = require('chrome-remote-interface');

class ChromeProtocol {

  constructor(opts) {
    opts = opts || {};

    this.categories = [
      "-*", // exclude default
      "toplevel",
      "blink.console",
      "devtools.timeline",
      "disabled-by-default-devtools.timeline",
      "disabled-by-default-devtools.timeline.frame",
      "disabled-by-default-devtools.timeline.stack",
      "disabled-by-default-devtools.screenshot",
      "disabled-by-default-v8.cpu_profile"
    ];
  }

  _requestTab() {
    return new Promise((resolve, reject) => {
      if (this._instance) {
        return resolve(this._instance);
      }

      chromeremoteinterface({ /* github.com/cyrus-and/chrome-remote-interface#moduleoptions-callback */ },
        instance => {
          this._instance = instance;
          resolve(instance);
        }
      ).on('error', e => reject(e));
    });
  }

  discardTab() {
    this._instance.close();
  }

  resetFailureTimeout(reject) {
    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
    }

    this.timeoutID = setTimeout(_ => {
      this.discardTab();
      reject(new Error('Trace retrieval timed out'));
    }, 15 * 1000);
  }

  subscribeToServiceWorkerDetails(fn) {
    var chrome = this._instance;

    return new Promise(function(res, rej) {
      chrome.ServiceWorker.enable();
      // chrome.on("ServiceWorker.workerCreated", log)
      // chrome.on("ServiceWorker.workerRegistrationUpdated", log)
      chrome.on("ServiceWorker.workerVersionUpdated", data => {
        res(fn(data));
      });
    });
  }

  static getEvaluationContextFor(url, instance) {
    return new Promise((res, rej) => {
      var errorTimeout = setTimeout((_ => rej(new Error(`No Evaluation context found for ${url}`))), 4000);

      instance.on('Runtime.executionContextCreated', evalContext => {
        if (evalContext.context.origin.indexOf(url) !== -1) {
          clearTimeout(errorTimeout);
          res(evalContext.context.id);
        }
      });
    });
  }

  evaluateFunction(fn, url) {
    var wrappedScriptStr = '(' + fn.toString() + ')()';
    return this.evaluateString(wrappedScriptStr, url);
  }

  evaluateString(scriptStr, url) {
    var chrome = this._instance;

    chrome.Runtime.enable();
    return ChromeProtocol.getEvaluationContextFor(url, chrome)
      .then(contextId => {
        return new Promise((resolve, reject) => {
          var evalOpts = {
            expression: scriptStr,
            contextId: contextId
          };
          chrome.Runtime.evaluate(evalOpts, (err, evalResult) => {
            if (err || evalResult.wasThrown) {
              return reject(evalResult);
            }
            getObjectDetails(evalResult.result, resolve);
          });
        });
      });

    function getObjectDetails(obj, resolve) {
      chrome.Runtime.getProperties({
        objectId: obj.objectId
      }, (err, propsResult) => {
        if (err) {
          /* continue anyway */
        }
        obj.props = {};
        if (Array.isArray(propsResult.result)) {
          propsResult.result.forEach(prop => {
            obj.props[prop.name] = prop.value ? prop.value.value : prop.get.description;
          });
        }
        resolve(obj);
      });
    }
  }

  profilePageLoad(url) {
    return new Promise((function(resolve, reject) {
      var rawEvents = [];
      this.resetFailureTimeout(reject);

      this._instance.Page.enable();
      this._instance.Tracing.start({
        categories: this.categories.join(','),
        options: "sampling-frequency=10000"  // 1000 is default and too slow.
      }, (err, data) => {
        if (err) {
          reject(data);
        }
      });

      this._instance.Page.navigate({url: url});
      this._instance.Page.loadEventFired(_ => {
        this._instance.Tracing.end();
        this.resetFailureTimeout(reject);
      });

      this._instance.Tracing.dataCollected(function(data) {
        rawEvents = rawEvents.concat(data.value);
      });

      this._instance.Tracing.tracingComplete(_ => {
        resolve(rawEvents);
        // this.discardTab(); // FIXME: close connection later
      });
    }).bind(this));
  }
}

module.exports = ChromeProtocol;
