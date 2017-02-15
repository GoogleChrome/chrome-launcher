/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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
'use strict';

const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

const KB_IN_BYTES = 1024;
const WASTEFUL_THRESHOLD_IN_BYTES = 20 * KB_IN_BYTES;

/**
 * @overview Used as the base for all byte efficiency audits. Computes total bytes
 *    and estimated time saved. Subclass and override `audit_` to return results.
 */
class UnusedBytes extends Audit {
  /**
   * @param {number} bytes
   * @return {number}
   */
  static bytesToKbString(bytes) {
    return Math.round(bytes / KB_IN_BYTES).toLocaleString() + ' KB';
  }

  /**
   * @param {number} bytes
   * @param {percent} percent
   */
  static toSavingsString(bytes = 0, percent = 0) {
    const kbDisplay = this.bytesToKbString(bytes);
    const percentDisplay = Math.round(percent).toLocaleString() + '%';
    return `${kbDisplay} _${percentDisplay}_`;
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const networkRecords = artifacts.networkRecords[Audit.DEFAULT_PASS];
    return artifacts.requestNetworkThroughput(networkRecords).then(networkThroughput => {
      const result = this.audit_(artifacts);
      const debugString = result.debugString;
      const results = result.results
          .map(item => {
            item.wastedKb = this.bytesToKbString(item.wastedBytes);
            item.totalKb = this.bytesToKbString(item.totalBytes);
            item.potentialSavings = this.toSavingsString(item.wastedBytes, item.wastedPercent);
            return item;
          })
          .sort((itemA, itemB) => itemB.wastedBytes - itemA.wastedBytes);

      const wastedBytes = results.reduce((sum, item) => sum + item.wastedBytes, 0);
      // Only round to nearest 10ms since we're relatively hand-wavy
      const wastedMs = Math.round(wastedBytes / networkThroughput * 100) * 10;

      let displayValue = '';
      if (wastedBytes) {
        const wastedKbDisplay = this.bytesToKbString(wastedBytes);
        const wastedMsDisplay = wastedMs.toLocaleString() + 'ms';
        displayValue = `Potential savings of ${wastedKbDisplay} (~${wastedMsDisplay})`;
      }

      return this.generateAuditResult({
        debugString,
        displayValue,
        rawValue: typeof result.passes === 'undefined' ?
            wastedBytes < WASTEFUL_THRESHOLD_IN_BYTES :
            !!result.passes,
        extendedInfo: {
          formatter: Formatter.SUPPORTED_FORMATS.TABLE,
          value: {results, tableHeadings: result.tableHeadings}
        }
      });
    });
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {{results: !Array<Object>, tableHeadings: Object,
   *     passes: boolean=, debugString: string=}}
   */
  static audit_() {
    throw new Error('audit_ unimplemented');
  }
}

module.exports = UnusedBytes;
