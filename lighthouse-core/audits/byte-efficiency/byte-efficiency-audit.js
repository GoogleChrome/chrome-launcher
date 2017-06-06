/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit');
const Formatter = require('../../report/formatter');

const KB_IN_BYTES = 1024;

const WASTED_MS_FOR_AVERAGE = 300;
const WASTED_MS_FOR_POOR = 750;

/**
 * @overview Used as the base for all byte efficiency audits. Computes total bytes
 *    and estimated time saved. Subclass and override `audit_` to return results.
 */
class UnusedBytes extends Audit {
  /**
   * @param {number} wastedMs
   * @return {number}
   */
  static scoreForWastedMs(wastedMs) {
    if (wastedMs === 0) return 100;
    else if (wastedMs < WASTED_MS_FOR_AVERAGE) return 90;
    else if (wastedMs < WASTED_MS_FOR_POOR) return 65;
    else return 0;
  }

  /**
   * @param {number} bytes
   * @return {string}
   */
  static bytesToKbString(bytes) {
    return Math.round(bytes / KB_IN_BYTES).toLocaleString() + ' KB';
  }

  /**
   * @param {number} bytes
   * @param {number} percent
   * @return {string}
   */
  static toSavingsString(bytes = 0, percent = 0) {
    const kbDisplay = this.bytesToKbString(bytes);
    const percentDisplay = Math.round(percent).toLocaleString() + '%';
    return `${kbDisplay} (${percentDisplay})`;
  }

  /**
   * @param {number} bytes
   * @param {number} networkThroughput measured in bytes/second
   * @return {string}
   */
  static bytesToMsString(bytes, networkThroughput) {
    return (Math.round(bytes / networkThroughput * 100) * 10).toLocaleString() + 'ms';
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!Promise<!AuditResult>}
   */
  static audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    return artifacts.requestNetworkRecords(devtoolsLogs).then(networkRecords => {
      return artifacts.requestNetworkThroughput(networkRecords).then(networkThroughput =>
        Promise.resolve(this.audit_(artifacts, networkRecords)).then(result =>
          this.createAuditResult(result, networkThroughput)
        )
      );
    });
  }

  /**
   * @param {!Audit.HeadingsResult} result
   * @param {number} networkThroughput
   * @return {!AuditResult}
   */
  static createAuditResult(result, networkThroughput) {
    const debugString = result.debugString;
    const results = result.results
        .map(item => {
          const wastedPercent = 100 * item.wastedBytes / item.totalBytes;
          item.wastedKb = this.bytesToKbString(item.wastedBytes);
          item.wastedMs = this.bytesToMsString(item.wastedBytes, networkThroughput);
          item.totalKb = this.bytesToKbString(item.totalBytes);
          item.totalMs = this.bytesToMsString(item.totalBytes, networkThroughput);
          item.potentialSavings = this.toSavingsString(item.wastedBytes, wastedPercent);
          return item;
        })
        .sort((itemA, itemB) => itemB.wastedBytes - itemA.wastedBytes);

    const wastedBytes = results.reduce((sum, item) => sum + item.wastedBytes, 0);
    const wastedKb = Math.round(wastedBytes / KB_IN_BYTES);
    const wastedMs = Math.round(wastedBytes / networkThroughput * 100) * 10;

    let displayValue = result.displayValue || '';
    if (typeof result.displayValue === 'undefined' && wastedBytes) {
      const wastedKbDisplay = this.bytesToKbString(wastedBytes);
      const wastedMsDisplay = this.bytesToMsString(wastedBytes, networkThroughput);
      displayValue = `Potential savings of ${wastedKbDisplay} (~${wastedMsDisplay})`;
    }

    const v1TableHeadings = Audit.makeV1TableHeadings(result.headings);
    const v2TableDetails = Audit.makeV2TableDetails(result.headings, results);

    return {
      debugString,
      displayValue,
      rawValue: wastedMs,
      score: UnusedBytes.scoreForWastedMs(wastedMs),
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.TABLE,
        value: {
          wastedMs,
          wastedKb,
          results,
          tableHeadings: v1TableHeadings,
        },
      },
      details: v2TableDetails
    };
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
