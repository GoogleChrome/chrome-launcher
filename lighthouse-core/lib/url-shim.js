/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * URL shim so we keep our code DRY
 */

'use strict';

/* global self */

const Util = require('../report/v2/renderer/util.js');

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
 * @param {string} urlA
 * @param {string} urlB
 * @return {boolean}
 */
URL.originsMatch = function originsMatch(urlA, urlB) {
  try {
    return new URL(urlA).origin === new URL(urlB).origin;
  } catch (e) {
    return false;
  }
};

/**
 * @param {string} url
 * @return {?string}
 */
URL.getOrigin = function getOrigin(url) {
  try {
    const urlInfo = new URL(url);
    // check for both host and origin since some URLs schemes like data and file set origin to the
    // string "null" instead of the object
    return (urlInfo.host && urlInfo.origin) || null;
  } catch (e) {
    return null;
  }
};

/**
 * @param {string} url
 * @param {{numPathParts: number, preserveQuery: boolean, preserveHost: boolean}=} options
 * @return {string}
 */
URL.getURLDisplayName = function getURLDisplayName(url, options) {
  return Util.getURLDisplayName(new URL(url), options);
};

/**
 * Limits data URIs to 100 characters, returns all other strings untouched.
 * @param {string} url
 * @return {string}
 */
URL.elideDataURI = function elideDataURI(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'data:' ? url.slice(0, 100) : url;
  } catch (e) {
    return url;
  }
};

// There is fancy URL rewriting logic for the chrome://settings page that we need to work around.
// Why? Special handling was added by Chrome team to allow a pushState transition between chrome:// pages.
// As a result, the network URL (chrome://chrome/settings/) doesn't match the final document URL (chrome://settings/).
function rewriteChromeInternalUrl(url) {
  if (!url.startsWith('chrome://')) return url;
  return url.replace(/^chrome:\/\/chrome\//, 'chrome://');
}

/**
 * Determine if url1 equals url2, ignoring URL fragments.
 * @param {string} url1
 * @param {string} url2
 * @return {boolean}
 */
URL.equalWithExcludedFragments = function(url1, url2) {
  [url1, url2] = [url1, url2].map(rewriteChromeInternalUrl);
  try {
    url1 = new URL(url1);
    url1.hash = '';

    url2 = new URL(url2);
    url2.hash = '';

    return url1.href === url2.href;
  } catch (e) {
    return false;
  }
};

module.exports = URL;
