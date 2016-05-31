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
const manifestThemeColor = require('../../audits/manifest/theme-color');
const metaThemeColor = require('../../audits/html/meta-theme-color');

class AddressBarThemeColor extends Aggregate {

  /**
   * @override
   * @return {string}
   */
  static get name() {
    return 'Address bar matches brand colors';
  }

  /**
   * @override
   * @return {string}
   */
  static get description() {
    return `The browser address bar can be themed to match your site. A theme-color
            <a href="https://developers.google.com/web/updates/2014/11/Support-for-theme-color-in-Chrome-39-for-Android">meta tag</a>
            will upgrade the address bar when a user browses the site, and the
            <a href="https://developers.google.com/web/updates/2015/08/using-manifest-to-set-sitewide-theme-color">manifest theme-color</a>
            will apply the same theme site-wide once it's been added to homescreen.`;
  }

  /**
   * @override
   * @return {!AggregationType}
   */
  static get type() {
    return Aggregate.TYPES.PWA;
  }

  /**
   * For the address bar to adopt a theme color, Chrome needs the following:
   *   - has valid manifest
   *   - valid theme_color in manifest
   *   - valid theme-color <meta> element
   *
   * The <meta> theme-color is required as Chrome doesn't yet proactively fetch the
   * manifest. Once fetched, the manifest theme_color will be used unless a <meta>
   * overrides it.
   *
   * @see https://github.com/GoogleChrome/lighthouse/issues/25
   * @override
   * @return {!AggregationCriteria}
   */
  static get criteria() {
    const criteria = {};
    criteria[manifestExists.meta.name] = {
      value: true,
      weight: 1
    };

    criteria[manifestThemeColor.meta.name] = {
      value: true,
      weight: 1
    };

    criteria[metaThemeColor.meta.name] = {
      value: true,
      weight: 1
    };

    return criteria;
  }
}

module.exports = AddressBarThemeColor;
