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
 * @fileoverview Audit a page to see if it's using console.time()/console.timeEnd.
 */

'use strict';

const url = require('url');
const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

class NoConsoleTimeAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'JavaScript',
      name: 'no-console-time',
      description: 'Site does not use console.time() in its own scripts',
      helpText: 'Consider using the <a href="https://developer.mozilla.org/en-US/docs/Web/API/User_Timing_API" target="_blank">User Timing API</a> (<a href="https://developer.mozilla.org/en-US/docs/Web/API/Performance/mark" target="_blank">performance.mark()</a> and <a href="https://developer.mozilla.org/en-US/docs/Web/API/Performance/measure" target="_blank">performance.measure()</a>), which is a standard, uses high resolution timestamps, and has the added benefit of integrating with the DevTools timeline.',
      requiredArtifacts: ['URL', 'ConsoleTimeUsage']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (artifacts.ConsoleTimeUsage.value === -1) {
      let debugString = 'Unknown error with the ConsoleTimeUsage gatherer';
      if (artifacts.ConsoleTimeUsage.debugString) {
        debugString = artifacts.ConsoleTimeUsage.debugString;
      }

      return NoConsoleTimeAudit.generateAuditResult({
        rawValue: -1,
        debugString
      });
    }

    const pageHost = url.parse(artifacts.URL.finalUrl).host;
    // Filter usage from other hosts and keep eval'd code.
    const results = artifacts.ConsoleTimeUsage.usage.filter(err => {
      return err.isEval ? err.url : url.parse(err.url).host === pageHost;
    }).map(err => {
      return Object.assign({
        label: `line: ${err.line}, col: ${err.col}`
      }, err);
    });

    return NoConsoleTimeAudit.generateAuditResult({
      rawValue: results.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: results
      }
    });
  }
}

module.exports = NoConsoleTimeAudit;
