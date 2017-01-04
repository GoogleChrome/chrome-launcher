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

/**
 * URL shim so we keep our code DRY
 */

'use strict';

/* global self */

// TODO: Add back node require('url').URL parsing when bug is resolved:
// https://github.com/GoogleChrome/lighthouse/issues/1186
const URL = (typeof self !== 'undefined' && self.URL) || require('whatwg-url').URL;

URL.INVALID_URL_DEBUG_STRING =
    'Lighthouse was unable to determine the URL of some script executions. ' +
    'It\'s possible a Chrome extension or other eval\'d code is the source.';

class LighthouseURL extends URL {
  /**
   * @param {string} url
   * @return {boolean}
   */
  static isValid(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * @param {string} urlA
   * @param {string} urlB
   * @return {boolean}
   */
  static hostsMatch(urlA, urlB) {
    try {
      return new URL(urlA).host === new URL(urlB).host;
    } catch (e) {
      return false;
    }
  }
}

module.exports = LighthouseURL;
