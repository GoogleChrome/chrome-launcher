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

/** @type {string} */
const manifestExists = require('../../audits/manifest/exists').name;

/** @type {string} */
const manifestName = require('../../audits/manifest/name').name;

/** @type {string} */
const manifestBackgroundColor = require('../../audits/manifest/background-color').name;

/** @type {string} */
const manifestThemeColor = require('../../audits/manifest/theme-color').name;

/** @type {string} */
const manifestIcons = require('../../audits/manifest/icons').name;

/** @type {string} */
const manifestIcons192 = require('../../audits/manifest/icons-192').name;

class SplashScreen extends Aggregate {

  /**
   * @override
   * @return {string}
   */
  static get name() {
    return 'Will Launch With A Splash Screen';
  }

  /**
   * An app that was installed to homescreen can get a custom splash screen
   * while launching.
   * Chrome needs the following:
   *   - has valid manifest
   *   - manifest has valid name
   *   - manifest has valid background_color
   *   - manifest has valid theme_color
   *   - icon of size >= 192x192
   *     - while optional, icons at 256, 384 and 512 will be used when appropriate
   * @see https://github.com/GoogleChrome/lighthouse/issues/24
   *
   * @override
   * @return {!AggregationCriteria}
   */
  static get criteria() {
    const criteria = {};

    criteria[manifestExists] = {
      value: true,
      weight: 1
    };

    criteria[manifestName] = {
      value: true,
      weight: 0
    };

    criteria[manifestBackgroundColor] = {
      value: true,
      weight: 1
    };

    criteria[manifestThemeColor] = {
      value: true,
      weight: 0
    };

    criteria[manifestIcons] = {
      value: true,
      weight: 1
    };

    criteria[manifestIcons192] = {
      value: true,
      weight: 1
    };

    return criteria;
  }
}

module.exports = SplashScreen;
