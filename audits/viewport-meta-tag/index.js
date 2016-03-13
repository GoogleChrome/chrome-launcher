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

class ViewportMetaTagTest {

  /**
   * Runs the Viewport Test. Looks for a viewport meta tag.
   * @param  {*} inputs The test inputs.
   * @return {Number} A score. 1 = viewport meta tag present; 0 = not found.
   */
  run(inputs) {
    if (typeof inputs === 'undefined') {
      return Promise.reject('No data provided.');
    }

    if (typeof inputs.driver === 'undefined') {
      return Promise.reject('No Driver provided.');
    }

    let driver = inputs.driver;
    let ret = {};

    return driver
      .requestTab(inputs.url)
      // make this not totally stupid.
      .then((instance) => {
        return driver.evaluateScript(findMetaViewport)
            .then((obj) => {
              if (obj.type === "object" && obj.subtype === "null")
                ret = { pass : false };
              else if (obj.subtype === 'node' && obj.props.content.includes('width='))
                ret = { pass: true };
              else
                throw new Error("Unexpected viewport elements.");
              return ret;
            });
      });

    // Else zero.
    // return Promise.resolve(false);
  }

}

// must be defined as a standalone function expression to be stringified successfully.
function findMetaViewport() {
  // If there's a viewport return a score of 1.
  // TODO(paullewis): make this test more nuanced.
  return document.head.querySelector('meta[name="viewport"]')
}


module.exports = new ViewportMetaTagTest();
