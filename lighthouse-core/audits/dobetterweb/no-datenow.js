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
      description: 'Avoids `Date.now()` in its own scripts',
      helpText: 'Consider using `performance.now()` from the User Timing API ' +
          'instead. It provides high-precision timestamps, independent of the system ' +
          'clock. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/date-now).',
      requiredArtifacts: ['URL', 'DateNowUse']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    let debugString;
    // Filter usage from other hosts and keep eval'd code.
    const results = artifacts.DateNowUse.filter(err => {
      if (err.isEval) {
        return !!err.url;
      }

      if (URL.isValid(err.url)) {
        return URL.hostsMatch(artifacts.URL.finalUrl, err.url);
      }

      // If the violation doesn't have a valid url, don't filter it out, but
      // warn the user that we don't know what the callsite is.
      debugString = URL.INVALID_URL_DEBUG_STRING;
      return true;
    });

    return NoDateNowAudit.generateAuditResult({
      rawValue: results.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.TABLE,
        value: {
          results,
          tableHeadings: {url: 'URL', lineCol: 'Line/Col', isEval: 'Eval\'d?'}
        }
      },
      debugString
    });
  }
}

module.exports = NoDateNowAudit;
