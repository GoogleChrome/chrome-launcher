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
const serviceWorker = require('../../audits/offline/service-worker').name;

/** @type {string} */
const manifestExists = require('../../audits/manifest/exists').name;

/** @type {string} */
const manifestStartUrl = require('../../audits/manifest/start-url').name;

/** @type {string} */
const manifestIconsMin144 = require('../../audits/manifest/icons-min-144').name;

/** @type {string} */
const manifestShortName = require('../../audits/manifest/short-name').name;

class AddToHomescreen extends Aggregate {

  /**
   * @override
   * @return {string}
   */
  static get name() {
    return 'User can be prompted to Add to Homescreen';
  }

  /**
   * @override
   * @return {string}
   */
  static get description() {
    return `While users can manually add your site to their homescreen in the browser menu, the
            <a href="https://developers.google.com/web/updates/2015/03/increasing-engagement-with-app-install-banners-in-chrome-for-android?hl=en">prompt
            (aka app install banner)</a> will proactively prompt the user to install the
            app if the below requirements are met and the user has visited your site at
            least twice (with at least five minutes between visits).`;
  }

  /**
   * @override
   * @return {!AggregationType}
   */
  static get type() {
    return Aggregate.TYPES.PWA;
  }

  /**
   * For the install-to-homescreen / install-app-banner prompt to show,
   * Chrome needs the following:
   *   - has a registered SW
   *   - has valid manifest
   *   - valid start_url
   *   - valid name
   *   - valid short_name
   *   - short_name of reasonable length
   *   - icon of size >= 144x144 (technically 48dp)
   *       and png (either type `image/png` or filename ending in `.png`
   * @see https://github.com/GoogleChrome/lighthouse/issues/23

   * If you'd like to provide native rendering of icon for homescreen and
   * splashscreen across supported screen densities, provide in these sizes:
   *   72, 96, 144, 192, 256, 384, 512

   * @override
   * @return {!AggregationCriteria}
   */
  static get criteria() {
    const criteria = {};
    criteria[serviceWorker] = {
      value: true,
      weight: 1
    };

    criteria[manifestExists] = {
      value: true,
      weight: 1
    };

    criteria[manifestStartUrl] = {
      value: true,
      weight: 1
    };

    criteria[manifestIconsMin144] = {
      value: true,
      weight: 1
    };

    criteria[manifestShortName] = {
      value: true,
      weight: 0
    };

    return criteria;
  }
}

module.exports = AddToHomescreen;
