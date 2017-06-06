/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to see if it's using document.write()
 */

'use strict';

const ViolationAudit = require('../violation-audit');
const Formatter = require('../../report/formatter');

class NoDocWriteAudit extends ViolationAudit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'no-document-write',
      description: 'Avoids `document.write()`',
      helpText: 'For users on slow connections, external scripts dynamically injected via ' +
          '`document.write()` can delay page load by tens of seconds. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/document-write).',
      requiredArtifacts: ['ChromeConsoleMessages']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const results = ViolationAudit.getViolationResults(artifacts, /document\.write/);

    const headings = [
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'label', itemType: 'text', text: 'Location'},
    ];
    const details = ViolationAudit.makeV2TableDetails(headings, results);

    return {
      rawValue: results.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URL_LIST,
        value: results
      },
      details,
    };
  }
}

module.exports = NoDocWriteAudit;
