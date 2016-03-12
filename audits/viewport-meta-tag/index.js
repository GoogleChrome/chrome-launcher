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

    if (typeof inputs.dom !== 'function') {
      return Promise.reject('No DOM Parser provided.');
    }

    let domParser = inputs.dom;
    let viewport = domParser('meta[name="viewport"]');

    // If there's a viewport return a score of 1.
    // TODO(paullewis): make this test more nuanced.
    if (typeof viewport !== 'undefined' && viewport !== null) {
      return Promise.resolve(true);
    }

    // Else zero.
    return Promise.resolve(false);
  }
}

module.exports = new ViewportMetaTagTest();
