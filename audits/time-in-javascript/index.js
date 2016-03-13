/**
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

let traceProcessor = require('../../lib/processor');

class TimeInJavaScriptTest {

  run(inputs) {
    if (inputs.length < 1) {
      return Promise.reject('No data provided.');
    }

    if (typeof inputs.driver !== 'object') {
      return Promise.reject('No Driver provided.');
    }

    if (typeof inputs.url !== 'string') {
      return Promise.reject('No URL provided.');
    }

    return new Promise((resolve, reject) => {
      let driver = inputs.driver;

      driver
        .requestTab(inputs.url)
        .then(driver.profilePageLoad.bind(driver))
        .then(contents => traceProcessor.analyzeTrace(contents))
        .then(results => {
          resolve(results[0].extendedInfo.javaScript);
        }).catch(err => {
          console.error(err);
        });
    });
  }
}

module.exports = new TimeInJavaScriptTest();
