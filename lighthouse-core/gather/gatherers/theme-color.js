/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer');

class ThemeColor extends Gatherer {

  /**
   * @param {{driver: !Object}} options
   * @return {!Promise<?string>} The value of the theme-color meta's content attribute, or null
   */
  afterPass(options) {
    const driver = options.driver;

    return driver.querySelector('head meta[name="theme-color"]')
      .then(node => node && node.getAttribute('content'));
  }
}

module.exports = ThemeColor;
