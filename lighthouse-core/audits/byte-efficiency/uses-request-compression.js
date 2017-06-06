/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/*
 * @fileoverview Audit a page to ensure that resources loaded with
 * gzip/br/deflate compression.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit');
const URL = require('../../lib/url-shim');

const IGNORE_THRESHOLD_IN_BYTES = 1400;
const IGNORE_THRESHOLD_IN_PERCENT = 0.1;

class ResponsesAreCompressed extends ByteEfficiencyAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'uses-request-compression',
      informative: true,
      description: 'Enable text compression',
      helpText: 'Text-based responses should be served with compression (gzip, deflate or brotli)' +
        ' to minimize total network bytes.' +
        ' [Learn more](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/optimize-encoding-and-transfer).',
      requiredArtifacts: ['ResponseCompression', 'devtoolsLogs']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @param {number} networkThroughput
   * @return {!Audit.HeadingsResult}
   */
  static audit_(artifacts) {
    const uncompressedResponses = artifacts.ResponseCompression;

    const results = [];
    uncompressedResponses.forEach(record => {
      const originalSize = record.resourceSize;
      const gzipSize = record.gzipSize;
      const gzipSavings = originalSize - gzipSize;

      // we require at least 10% savings off the original size AND at least 1400 bytes
      // if the savings is smaller than either, we don't care
      if (
          1 - gzipSize / originalSize < IGNORE_THRESHOLD_IN_PERCENT ||
          gzipSavings < IGNORE_THRESHOLD_IN_BYTES
      ) {
        return;
      }

      // remove duplicates
      const url = URL.elideDataURI(record.url);
      const isDuplicate = results.find(res => res.url === url &&
        res.totalBytes === record.resourceSize);
      if (isDuplicate) {
        return;
      }

      results.push({
        url,
        totalBytes: originalSize,
        wastedBytes: gzipSavings,
      });
    });

    const headings = [
      {key: 'url', itemType: 'url', text: 'Uncompressed resource URL'},
      {key: 'totalKb', itemType: 'text', text: 'Original'},
      {key: 'potentialSavings', itemType: 'text', text: 'GZIP Savings'},
    ];

    return {
      results,
      headings,
    };
  }
}

module.exports = ResponsesAreCompressed;
