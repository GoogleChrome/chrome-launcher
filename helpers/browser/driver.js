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

/*
 * This approach is very much based on Sam Saccone's excellent memory leak
 * detector: Drool.
 * @see https://github.com/samccone/drool
 */
let webdriver = require('selenium-webdriver');
let chrome = require('selenium-webdriver/chrome');
let controlFlow = webdriver.promise.controlFlow();

class Driver {

  constructor (opts) {
    opts = opts || {};

    let options = new chrome.Options();

    if (opts.android) {
      options = options.androidChrome();
    }

    // Add on GPU benchmarking.
    options.addArguments('enable-gpu-benchmarking');

    // Run without a sandbox.
    options.addArguments('no-sandbox');

    this.browser_ = null;
    this.browser = new webdriver.Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
  }

  get browser () {
    return this.browser_;
  }

  set browser (browser_) {
    this.browser_ = browser_;
  }

  flow (steps) {
    steps.forEach((step) => {
      controlFlow.execute(step);
    });
  }
}

module.exports = Driver;
