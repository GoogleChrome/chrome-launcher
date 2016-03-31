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

const Aggregate = require('../aggregate');

class AddToHomescreen extends Aggregate {

  static get name() {
    return 'Omnibox Matches Brand Colors';
  }

  /**
   * For the omnibox to adopt a theme color, Chrome needs the following:
   *   - has valid manifest
   *   - valid theme_color in manifest
   *   - valid theme-color <meta> element
   *
   * The <meta> theme-color is required as Chrome doesn't yet proactively fetch the
   * manifest. Once fetched, the manifest theme_color will be used unless a <meta>
   * overrides it.
   *
   * More details: https://github.com/GoogleChrome/lighthouse/issues/25
   */
  static get criteria() {
    const manifestExists = require('../../audits/manifest/exists').name;
    const manifestThemeColor = require('../../audits/manifest/theme-color').name;
    const metaThemeColor = require('../../audits/html/meta-theme-color').name;

    const criteria = {};
    criteria[manifestExists] = {
      value: true,
      weight: 1
    };

    criteria[manifestThemeColor] = {
      value: true,
      weight: 1
    };

    criteria[metaThemeColor] = {
      value: true,
      weight: 1
    };

    return criteria;
  }
}

module.exports = AddToHomescreen;
