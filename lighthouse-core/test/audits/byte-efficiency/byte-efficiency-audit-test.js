/**
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

const ByteEfficiencyAudit = require('../../../audits/byte-efficiency/byte-efficiency-audit');
const assert = require('assert');

/* eslint-env mocha */

describe('Byte efficiency base audit', () => {
  it('should format as extendedInfo', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [],
    });

    assert.deepEqual(result.extendedInfo.value.results, []);
    assert.deepEqual(result.extendedInfo.value.tableHeadings, {value: 'Label'});
  });

  it('should set the rawValue', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [{wastedBytes: 2345, totalBytes: 3000, wastedPercent: 65}],
    }, 5000);

    assert.equal(result.rawValue, 470); // 2345 / 5000 * 1000 ~= 470
  });

  it('should score the wastedMs', () => {
    const perfectResult = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [{wastedBytes: 400, totalBytes: 4000, wastedPercent: 10}],
    }, 100000);

    const goodResult = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [{wastedBytes: 2345, totalBytes: 3000, wastedPercent: 65}],
    }, 10000);

    const averageResult = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [{wastedBytes: 2345, totalBytes: 3000, wastedPercent: 65}],
    }, 5000);

    const failingResult = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [{wastedBytes: 45000, totalBytes: 45000, wastedPercent: 100}],
    }, 10000);

    assert.equal(perfectResult.score, 100, 'scores perfect wastedMs');
    assert.ok(goodResult.score > 75 && goodResult.score < 100, 'scores good wastedMs');
    assert.ok(averageResult.score > 50 && averageResult.score < 75, 'scores average wastedMs');
    assert.ok(failingResult.score < 50, 'scores failing wastedMs');
  });

  it('should populate Kb', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [{wastedBytes: 2048, totalBytes: 4096, wastedPercent: 50}],
    });

    assert.equal(result.extendedInfo.value.results[0].wastedKb, '2 KB');
    assert.equal(result.extendedInfo.value.results[0].totalKb, '4 KB');
  });

  it('should populate Ms', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [{wastedBytes: 350, totalBytes: 700, wastedPercent: 50}],
    }, 1000);

    assert.equal(result.extendedInfo.value.results[0].wastedMs, '350ms');
    assert.equal(result.extendedInfo.value.results[0].totalMs, '700ms');
  });

  it('should sort on wastedBytes', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [
        {wastedBytes: 350, totalBytes: 700, wastedPercent: 50},
        {wastedBytes: 450, totalBytes: 1000, wastedPercent: 50},
        {wastedBytes: 400, totalBytes: 450, wastedPercent: 50},
      ],
    });

    assert.equal(result.extendedInfo.value.results[0].wastedBytes, 450);
    assert.equal(result.extendedInfo.value.results[1].wastedBytes, 400);
    assert.equal(result.extendedInfo.value.results[2].wastedBytes, 350);
  });

  it('should create a display value', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: [{key: 'value', text: 'Label'}],
      results: [
        {wastedBytes: 512, totalBytes: 700, wastedPercent: 50},
        {wastedBytes: 512, totalBytes: 1000, wastedPercent: 50},
        {wastedBytes: 1024, totalBytes: 1200, wastedPercent: 50},
      ],
    }, 4096);

    assert.ok(result.displayValue.includes('2 KB'), 'contains correct bytes');
    assert.ok(result.displayValue.includes('500ms'), 'contains correct timing');
  });
});
