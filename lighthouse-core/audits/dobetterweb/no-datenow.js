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
 * @fileoverview Audit a page to see if it's using Date.now() (instead of a
 * newer API like performance.now()).
 */

'use strict';

const URL = require('../../lib/url-shim');
const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

class NoDateNowAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'JavaScript',
      name: 'no-datenow',
      description: 'Site does not use Date.now() in its own scripts',
      helpText: 'Consider using <code>performance.now()</code> from the User Timing API ' +
          'instead. It provides high-precision timestamps, independent of the system ' +
          'clock. <a href="https://developers.google.com/web/tools/lighthouse/audits/' +
          'date-now" target="_blank" rel="noopener">Learn more</a>.',
      requiredArtifacts: ['URL', 'DateNowUse']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (artifacts.DateNowUse.value === -1) {
      let debugString = 'Unknown error with the DateNowUse gatherer';
      if (artifacts.DateNowUse.debugString) {
        debugString = artifacts.DateNowUse.debugString;
      }

      return NoDateNowAudit.generateAuditResult({
        rawValue: -1,
        debugString
      });
    }

    let debugString;

    const pageHost = new URL(artifacts.URL.finalUrl).host;
    // Filter usage from other hosts and keep eval'd code.
    const results = artifacts.DateNowUse.usage.filter(err => {
      if (err.isEval) {
        return !!err.url;
      }

      // If the violation doesn't have a valid url, don't filter it out, but
      // warn the user that we don't know what the callsite is.
      try {
        return new URL(err.url).host === pageHost;
      } catch (e) {
        debugString = 'Lighthouse was unable to determine if some API uses ' +
                      'were made by this page. It\'s possible a Chrome extension' +
                      'content script or other eval\'d code is calling this API.';
        return true;
      }
    }).map(err => {
      return Object.assign({
        label: `line: ${err.line}, col: ${err.col}`,
        url: err.url
      }, err);
    });

    return NoDateNowAudit.generateAuditResult({
      rawValue: results.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: results
      },
      debugString
    });
  }
}

module.exports = NoDateNowAudit;
