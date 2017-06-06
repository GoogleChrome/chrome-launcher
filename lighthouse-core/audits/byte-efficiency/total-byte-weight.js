/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
 /**
  * @fileoverview
  */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit');
const Formatter = require('../../report/formatter');
const TracingProcessor = require('../../lib/traces/tracing-processor');

// Parameters for log-normal CDF scoring. See https://www.desmos.com/calculator/gpmjeykbwr
// ~75th and ~90th percentiles http://httparchive.org/interesting.php?a=All&l=Feb%201%202017&s=All#bytesTotal
const OPTIMAL_VALUE = 1600 * 1024;
const SCORING_POINT_OF_DIMINISHING_RETURNS = 2500 * 1024;
const SCORING_MEDIAN = 4000 * 1024;

class TotalByteWeight extends ByteEfficiencyAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Network',
      name: 'total-byte-weight',
      optimalValue: `< ${this.bytesToKbString(OPTIMAL_VALUE)}`,
      description: 'Avoids enormous network payloads',
      helpText:
          'Network transfer size [costs users real money](https://whatdoesmysitecost.com/) ' +
          'and is [highly correlated](http://httparchive.org/interesting.php#onLoad) with long load times. ' +
          'Try to find ways to reduce the size of required files.',
      scoringMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['devtoolsLogs']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!Promise<!AuditResult>}
   */
  static audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[ByteEfficiencyAudit.DEFAULT_PASS];
    return artifacts.requestNetworkRecords(devtoolsLogs).then(networkRecords => {
      return artifacts.requestNetworkThroughput(networkRecords).then(networkThroughput => {
        let totalBytes = 0;
        let results = [];
        networkRecords.forEach(record => {
          // exclude data URIs since their size is reflected in other resources
          // exclude unfinished requests since they won't have transfer size information
          if (record.scheme === 'data' || !record.finished) return;

          const result = {
            url: record.url,
            totalBytes: record.transferSize,
            totalKb: this.bytesToKbString(record.transferSize),
            totalMs: this.bytesToMsString(record.transferSize, networkThroughput),
          };

          totalBytes += result.totalBytes;
          results.push(result);
        });
        results = results.sort((itemA, itemB) => itemB.totalBytes - itemA.totalBytes).slice(0, 10);


        // Use the CDF of a log-normal distribution for scoring.
        //   <= 1600KB: score≈100
        //   4000KB: score=50
        //   >= 9000KB: score≈0
        const distribution = TracingProcessor.getLogNormalDistribution(
          SCORING_MEDIAN, SCORING_POINT_OF_DIMINISHING_RETURNS);
        const score = 100 * distribution.computeComplementaryPercentile(totalBytes);

        const headings = [
          {key: 'url', itemType: 'url', text: 'URL'},
          {key: 'totalKb', itemType: 'text', text: 'Total Size'},
          {key: 'totalMs', itemType: 'text', text: 'Transfer Time'},
        ];

        const v1TableHeadings = ByteEfficiencyAudit.makeV1TableHeadings(headings);
        const v2TableDetails = ByteEfficiencyAudit.makeV2TableDetails(headings, results);

        return {
          rawValue: totalBytes,
          optimalValue: this.meta.optimalValue,
          displayValue: `Total size was ${ByteEfficiencyAudit.bytesToKbString(totalBytes)}`,
          score: Math.round(Math.max(0, Math.min(score, 100))),
          extendedInfo: {
            formatter: Formatter.SUPPORTED_FORMATS.TABLE,
            value: {
              results,
              tableHeadings: v1TableHeadings
            }
          },
          details: v2TableDetails
        };
      });
    });
  }
}

module.exports = TotalByteWeight;
