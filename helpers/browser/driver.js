/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
    // Add on GPU benchmarking.
    // FIXME: --enable-gpu-benchmarking

  }

  requestTab(url) {
    return new Promise(((resolve, reject) => {

      this.url = url;
      if (this.instance())
          return resolve(this.instance())

      chromeremoteinterface({ /* github.com/cyrus-and/chrome-remote-interface#moduleoptions-callback */ },
        instance => {
          this._instance = instance;
          resolve(instance);
        }
      ).on('error', (e)  => reject(e) );
    }).bind(this))
  }

  instance() {
    return this._instance;
  }

  discardTab() {
    if (this._instance)
      this._instance.close();
  }

  resetFailureTimeout(reject) {
    if (this.timeoutID)
        clearTimeout(this.timeoutID);

    this.timeoutID = setTimeout(_ => {
      this.discardTab();
      reject(new Error('Trace retrieval timed out'));
    }, 15 * 1000)
  }

  subscribeToServiceWorkerDetails(cb, resolve){
    var chrome = this.instance();

    chrome.ServiceWorker.enable();
    // chrome.on("ServiceWorker.workerCreated", log)
    // chrome.on("ServiceWorker.workerRegistrationUpdated", log)
    chrome.on("ServiceWorker.workerVersionUpdated", data => { cb(data, resolve); });
  }

  evaluateScript(scriptStr){
    return new Promise((function(resolve, reject) {

      chrome.Runtime.evaluate({
        expression : 'alert(navigator.userAgent)',
        contextId : 0
      }, result => {
        resolve(result);
      })

    }).bind(this));
  }

  profilePageLoad(chrome) {

    return new Promise((function(resolve, reject) {

      var rawEvents = [];
      this.resetFailureTimeout(reject);

      chrome.Page.enable();
      chrome.Tracing.start({
        "categories":   this.categories.join(','),
        "options":      "sampling-frequency=10000"  // 1000 is default and too slow.
      });

      chrome.Page.navigate({'url': this.url})
      chrome.Page.loadEventFired( _ =>  {
        chrome.Tracing.end()
        this.resetFailureTimeout(reject);
      });

      chrome.Tracing.dataCollected(function(data){
        rawEvents = rawEvents.concat(data.value);
      });

      chrome.Tracing.tracingComplete((function () {
        resolve(rawEvents);
        // this.discardTab(); // FIXME: close connection later
      }).bind(this));

    }).bind(this));
  }

}




module.exports = ChromeProtocol;
