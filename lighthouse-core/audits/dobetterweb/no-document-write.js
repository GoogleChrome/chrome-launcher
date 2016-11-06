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
 * @fileoverview Audit a page to see if it's using document.write()
 */

'use strict';

const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

class NoDocWriteAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'no-document-write',
      description: 'Site does not use document.write()',
      helpText: 'Consider using <code>&lt;script async></code> to load scripts. <code>document.write()</code> is considered <a href="https://developers.google.com/web/updates/2016/08/removing-document-write" target="_blank">harmful for performance</a>.',
      requiredArtifacts: ['DocWriteUse']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (typeof artifacts.DocWriteUse === 'undefined' ||
        artifacts.DocWriteUse === -1) {
      return NoDocWriteAudit.generateAuditResult({
        rawValue: -1,
        debugString: 'DocWriteUse gatherer did not run'
      });
    }

    const results = artifacts.DocWriteUse.usage.map(err => {
      return Object.assign({
        label: `line: ${err.line}, col: ${err.col}`
      }, err);
    });

    return NoDocWriteAudit.generateAuditResult({
      rawValue: results.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: results
      }
    });
  }
}

module.exports = NoDocWriteAudit;
