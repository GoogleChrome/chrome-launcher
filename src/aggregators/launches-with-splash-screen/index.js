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
const manifestExists = require('../../audits/manifest/exists');
const manifestName = require('../../audits/manifest/name');
const manifestBackgroundColor = require('../../audits/manifest/background-color');
const manifestThemeColor = require('../../audits/manifest/theme-color');
const manifestIconsMin192 = require('../../audits/manifest/icons-min-192');

class SplashScreen extends Aggregate {

  /**
   * @override
   * @return {string}
   */
  static get name() {
    return 'Installed web app will launch with custom splash screen';
  }

  /**
   * @override
   * @return {string}
   */
  static get description() {
    return `A default splash screen will be constructed, but meeting these requirements guarantee a
            high-quality and customizable <a href="https://developers.google.com/web/updates/2015/10/splashscreen?hl=en">splash screen</a>
            the user sees between tapping the home screen icon and your app’s first paint.`;
  }

  /**
   * @override
   * @return {!AggregationType}
   */
  static get type() {
    return Aggregate.TYPES.PWA;
  }

  /**
   * An app that was installed to homescreen can get a custom splash screen
   * while launching.
   * Chrome needs the following:
   *   - has valid manifest
   *   - manifest has valid name
   *   - manifest has valid background_color
   *   - manifest has valid theme_color
   *   - icon of size >= 192x192 (technically minimum is 48dp and ideal/non-scaled is 128dp)
   *     - while optional, icons at 256, 384 and 512 will be used when appropriate
   * @see https://github.com/GoogleChrome/lighthouse/issues/24
   *
   * @override
   * @return {!AggregationCriteria}
   */
  static get criteria() {
    const criteria = {};

    criteria[manifestExists.meta.name] = {
      value: true,
      weight: 1
    };

    criteria[manifestName.meta.name] = {
      value: true,
      weight: 0
    };

    criteria[manifestBackgroundColor.meta.name] = {
      value: true,
      weight: 1
    };

    criteria[manifestThemeColor.meta.name] = {
      value: true,
      weight: 0
    };

    criteria[manifestIconsMin192.meta.name] = {
      value: true,
      weight: 1
    };

    return criteria;
  }
}

module.exports = SplashScreen;
