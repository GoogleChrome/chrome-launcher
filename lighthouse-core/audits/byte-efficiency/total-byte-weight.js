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
 /**
  * @fileoverview
  */
'use strict';

const Audit = require('./byte-efficiency-audit');
const Formatter = require('../../formatters/formatter');
const TracingProcessor = require('../../lib/traces/tracing-processor');
const URL = require('../../lib/url-shim');

// Parameters for log-normal CDF scoring. See https://www.desmos.com/calculator/gpmjeykbwr
// ~75th and ~90th percentiles http://httparchive.org/interesting.php?a=All&l=Feb%201%202017&s=All#bytesTotal
const OPTIMAL_VALUE = 1600 * 1024;
const SCORING_POINT_OF_DIMINISHING_RETURNS = 2500 * 1024;
const SCORING_MEDIAN = 4000 * 1024;

class TotalByteWeight extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Network',
      name: 'total-byte-weight',
      optimalValue: this.bytesToKbString(OPTIMAL_VALUE),
      description: 'Avoids enormous network payloads',
      informative: true,
      helpText:
          'Network transfer size [costs users real dollars](https://whatdoesmysitecost.com/) ' +
          'and is [highly correlated](http://httparchive.org/interesting.php#onLoad) with long load times. ' +
          'Try to find ways to reduce the size of required files.',
      requiredArtifacts: ['networkRecords']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!Promise<!AuditResult>}
   */
  static audit(artifacts) {
    const networkRecords = artifacts.networkRecords[Audit.DEFAULT_PASS];
    return artifacts.requestNetworkThroughput(networkRecords).then(networkThroughput => {
      let totalBytes = 0;
      const results = networkRecords.reduce((prev, record) => {
        // exclude data URIs since their size is reflected in other resources
        if (record.scheme === 'data') {
          return prev;
        }

        const result = {
          url: URL.getDisplayName(record.url, {preserveQuery: true}),
          totalBytes: record.transferSize,
          totalKb: this.bytesToKbString(record.transferSize),
          totalMs: this.bytesToMsString(record.transferSize, networkThroughput),
        };

        totalBytes += result.totalBytes;
        prev.push(result);
        return prev;
      }, []).sort((itemA, itemB) => itemB.totalBytes - itemA.totalBytes).slice(0, 10);


      // Use the CDF of a log-normal distribution for scoring.
      //   <= 1600KB: score≈100
      //   4000KB: score=50
      //   >= 9000KB: score≈0
      const distribution = TracingProcessor.getLogNormalDistribution(
          SCORING_MEDIAN, SCORING_POINT_OF_DIMINISHING_RETURNS);
      const score = 100 * distribution.computeComplementaryPercentile(totalBytes);

      return this.generateAuditResult({
        rawValue: totalBytes,
        optimalValue: this.meta.optimalValue,
        displayValue: `Total size was ${Audit.bytesToKbString(totalBytes)}`,
        score: Math.round(Math.max(0, Math.min(score, 100))),
        extendedInfo: {
          formatter: Formatter.SUPPORTED_FORMATS.TABLE,
          value: {
            results,
            tableHeadings: {
              url: 'URL',
              totalKb: 'Total Size',
              totalMs: 'Transfer Time',
            }
          }
        }
      });
    });
  }
}

module.exports = TotalByteWeight;
