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

const url = require('url');
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
      helpText: 'Consider using <a href="https://developer.mozilla.org/en-US/docs/Web/API/Performance/now" target="_blank">performance.now()</a>, which has better precision than <code>Date.now()</code> and always increases at a constant rate, independent of the system clock.',
      requiredArtifacts: ['URL', 'DateNowUse']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (typeof artifacts.DateNowUse === 'undefined' ||
        artifacts.DateNowUse.value === -1) {
      let debugString = 'Unknown error with the DateNowUse gatherer';
      if (typeof artifacts.DateNowUse === 'undefined') {
        debugString = 'DateNowUse gatherer did not run';
      } else if (artifacts.DateNowUse.debugString) {
        debugString = artifacts.DateNowUse.debugString;
      }

      return NoDateNowAudit.generateAuditResult({
        rawValue: -1,
        debugString
      });
    }

    const pageHost = url.parse(artifacts.URL.finalUrl).host;
    // Filter usage from other hosts.
    const results = artifacts.DateNowUse.usage.filter(err => {
      return err.url ? url.parse(err.url).host === pageHost : false;
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
      }
    });
  }
}

module.exports = NoDateNowAudit;
