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

/* global document */

const Gatherer = require('./gatherer');
const fs = require('fs');
const axe = fs.readFileSync(
  require.resolve('axe-core/axe.min.js')
);

// This is run in the page, not Lighthouse itself.
// axe.run returns a promise which fulfills with a results object
// containing any violations.
/* istanbul ignore next */
function runA11yChecks() {
  return axe.run(document, {
    runOnly: {
      type: 'rule',
      values: [
        'aria-allowed-attr',
        'aria-required-attr',
        'aria-valid-attr',
        'aria-valid-attr-value',
        'color-contrast',
        'image-alt',
        'label',
        'tabindex'
      ]
    }
  });
}

class Accessibility extends Gatherer {
  /**
   * @param {!Object} options
   * @return {!Promise<{violations: !Array}>}
   */
  afterPass(options) {
    const driver = options.driver;
    const expression = `(function () {
      ${axe};
      return (${runA11yChecks.toString()}());
    })()`;

    return driver
      .evaluateAsync(expression)
      .then(returnedValue => {
        if (!returnedValue || !Array.isArray(returnedValue.violations)) {
          throw new Error('Unable to parse axe results' + returnedValue);
        }

        return returnedValue;
      });
  }
}

module.exports = Accessibility;
