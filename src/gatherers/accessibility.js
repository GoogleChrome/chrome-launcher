/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
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

/* global document, window */

const Gather = require('./gather');
const fs = require('fs');
const axe = fs.readFileSync(
  require.resolve('axe-core/axe.min.js')
);

function runA11yChecks() {
  axe.a11yCheck(document, function(results) {
    window.__axeResults = results;
  });
}

function fetchA11yResults() {
  if (typeof window.__axeResults !== 'undefined') {
    return window.__axeResults;
  }

  return null;
}

class Accessibility extends Gather {

  static _errorAccessibility(errorString) {
    return {
      accessibility: {
        raw: undefined,
        value: undefined,
        debugString: errorString
      }
    };
  }

  fetchResults(driver, count) {
    if (count === 0) {
      return Promise.resolve({
        result: {
          value: null
        }
      });
    }

    return new Promise((resolve, reject) => {
      setTimeout(_ => {
        driver.sendCommand('Runtime.evaluate', {
          expression: `(${fetchA11yResults.toString()}())`,
          returnByValue: true
        }).then(response => {
          // If the axe results aren't in try again.
          if (response.result.value === null) {
            return resolve(this.fetchResults(driver, count - 1));
          }

          resolve(response);
        });
      }, 100);
    });
  }

  postProfiling(options) {
    const driver = options.driver;

    return driver.sendCommand('Runtime.evaluate', {
      expression: `${axe};(${runA11yChecks.toString()}())`
    })

    // Goes into a 'busy wait' for axe results to land.
    .then(_ => this.fetchResults(driver, 10))
    .then(returnedData => {
      if (returnedData.result.value === undefined ||
          returnedData.result.value === null ||
          returnedData.result.value === {}) {
       // The returned object from Runtime.evaluate is an enigma
       // Sometimes if the returned object is not easily serializable,
       // it sets value = {}
        throw new Error('Accessibility gather error: ' +
          'Failed to get proper result from runtime eval');
      }

      const returnedValue = returnedData.result.value;

      if (returnedValue.error) {
        this.artifact = Accessibility._errorAccessibility(returnedValue.error);
      } else {
        this.artifact = {
          accessibility: returnedValue
        };
      }
    });
  }
}

module.exports = Accessibility;
