/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Audits a page to determine if it is calling deprecated APIs.
 * This is done by collecting console log messages and filtering them by ones
 * that contain deprecated API warnings sent by Chrome.
 */

const Audit = require('./audit');
const Formatter = require('../report/formatter');

class Deprecations extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Deprecations',
      name: 'deprecations',
      description: 'Avoids deprecated APIs',
      helpText: 'Deprecated APIs will eventually be removed from the browser. ' +
          '[Learn more](https://www.chromestatus.com/features#deprecated).',
      requiredArtifacts: ['ChromeConsoleMessages']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const entries = artifacts.ChromeConsoleMessages;

    const deprecations = entries.filter(log => log.entry.source === 'deprecation')
        .map(log => {
          // CSS deprecations can have missing URLs and lineNumbers. See https://crbug.com/680832.
          const label = log.entry.lineNumber ? `line: ${log.entry.lineNumber}` : 'line: ???';
          const url = log.entry.url || 'Unable to determine URL';
          return Object.assign({
            label,
            url,
            code: log.entry.text
          }, log.entry);
        });

    const deprecationsV2 = entries.filter(log => log.entry.source === 'deprecation').map(log => {
      return {
        type: 'code',
        text: log.entry.text,
        url: log.entry.url,
        source: log.entry.source,
        lineNumber: log.entry.lineNumber
      };
    });

    const headings = [
      {key: 'text', itemType: 'code', text: 'Deprecation / Warning'},
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'lineNumber', itemType: 'text', text: 'Line'},
    ];
    const details = Audit.makeV2TableDetails(headings, deprecationsV2);

    let displayValue = '';
    if (deprecations.length > 1) {
      displayValue = `${deprecations.length} warnings found`;
    } else if (deprecations.length === 1) {
      displayValue = `${deprecations.length} warning found`;
    }

    return {
      rawValue: deprecations.length === 0,
      displayValue,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URL_LIST,
        value: deprecations
      },
      details
    };
  }
}

module.exports = Deprecations;
