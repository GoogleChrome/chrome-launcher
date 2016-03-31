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

class SplashScreen extends Aggregate {

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
   * More details: https://github.com/GoogleChrome/lighthouse/issues/24
   */
  static get criteria() {
    const manifestExists = require('../../audits/manifest/exists').name;
    const manifestName = require('../../audits/manifest/name').name;
    const manifestBackgroundColor = require('../../audits/manifest/background-color').name;
    const manifestThemeColor = require('../../audits/manifest/theme-color').name;
    const manifestIcons = require('../../audits/manifest/icons').name;
    const manifestIcons192 = require('../../audits/manifest/icons-192').name;

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
