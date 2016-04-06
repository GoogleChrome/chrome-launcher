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
const manifestIcons = require('../../audits/manifest/icons').name;

/** @type {string} */
const manifestIcons192 = require('../../audits/manifest/icons-192').name;

/** @type {string} */
const manifestShortName = require('../../audits/manifest/short-name').name;

class AddToHomescreen extends Aggregate {

  /**
   * @override
   * @return {string}
   */
  static get name() {
    return 'Will Get Add to Homescreen Prompt';
  }

  /**
   * For the install-to-homescreen / install-app-banner prompt to show,
   * Chrome needs the following:
   *   - has a registered SW
   *   - has valid manifest
   *   - valid start_url
   *   - valid name
   *   - valid short_name
   *   - icon of size >= 144x144 and png (either type `image/png` or filename ending in `.png`
   * @see https://github.com/GoogleChrome/lighthouse/issues/23
   *
   * TODO: We should allow icons >=144, rather than >= 192
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

    criteria[manifestIcons] = {
      value: true,
      weight: 1
    };

    criteria[manifestIcons192] = {
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
