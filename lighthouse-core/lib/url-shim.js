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

/**
 * @param {string} url
 * @return {boolean}
 */
URL.isValid = function isValid(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * @param {string} urlA
 * @param {string} urlB
 * @return {boolean}
 */
URL.hostsMatch = function hostsMatch(urlA, urlB) {
  try {
    return new URL(urlA).host === new URL(urlB).host;
  } catch (e) {
    return false;
  }
};


/**
 * @param {string} url
 * @return {string}
 */
URL.getDisplayName = function getDisplayName(url) {
  const parsed = new URL(url);

  // Handle 'about:*' URLs specially since they have no path.
  let name = parsed.protocol === 'about:' ? parsed.href :
      // Otherwise, remove any query strings from the path.
      parsed.pathname.replace(/\?.*/, '')
      // And grab the last two parts.
      .split('/').slice(-2).join('/');

  const MAX_LENGTH = 64;
  // Always elide hash
  name = name.replace(/([a-f0-9]{7})[a-f0-9]{13}[a-f0-9]*/g, '$1\u2026');
  // Elide too long names
  if (name.length > MAX_LENGTH) {
    const dotIndex = name.lastIndexOf('.');
    name = name.slice(0, MAX_LENGTH - 1 - (name.length - dotIndex)) +
        // Show file extension
        `\u2026${name.slice(dotIndex)}`;
  }

  return name;
};

module.exports = URL;
