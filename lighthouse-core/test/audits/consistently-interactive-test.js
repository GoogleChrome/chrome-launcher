/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ConsistentlyInteractive = require('../../audits/consistently-interactive.js');
const Runner = require('../../runner.js');
const assert = require('assert');

const acceptableTrace = require('../fixtures/traces/progressive-app-m60.json');
const acceptableDevToolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

const redirectTrace = require('../fixtures/traces/site-with-redirect.json');
const redirectDevToolsLog = require('../fixtures/traces/site-with-redirect.devtools.log.json');

function generateNetworkRecords(records, navStart) {
  const navStartInMs = navStart / 1000;
  return records.map(item => {
    return {
      finished: typeof item.finished === 'undefined' ? true : item.finished,
      startTime: (item.start + navStartInMs) / 1000,
      endTime: item.end === -1 ? -1 : (item.end + navStartInMs) / 1000,
    };
  });
}

/* eslint-env mocha */
describe('Performance: consistently-interactive audit', () => {
  it('should compute consistently interactive', () => {
    const artifacts = Object.assign({
      traces: {
        [ConsistentlyInteractive.DEFAULT_PASS]: acceptableTrace
      },
      devtoolsLogs: {
        [ConsistentlyInteractive.DEFAULT_PASS]: acceptableDevToolsLog
      },
    }, Runner.instantiateComputedArtifacts());

    return ConsistentlyInteractive.audit(artifacts).then(output => {
      assert.equal(output.score, 99);
      assert.equal(Math.round(output.rawValue), 1582);
      assert.equal(output.displayValue, '1,580\xa0ms');
    });
  });

  it('should compute consistently interactive on pages with redirect', () => {
    const artifacts = Object.assign({
      traces: {
        [ConsistentlyInteractive.DEFAULT_PASS]: redirectTrace
      },
      devtoolsLogs: {
        [ConsistentlyInteractive.DEFAULT_PASS]: redirectDevToolsLog
      },
    }, Runner.instantiateComputedArtifacts());

    return ConsistentlyInteractive.audit(artifacts).then(output => {
      assert.equal(output.score, 95);
      assert.equal(Math.round(output.rawValue), 2712);
      assert.equal(output.displayValue, '2,710\xa0ms');
    });
  });

  describe('#findOverlappingQuietPeriods', () => {
    it('should return entire range when no activity is present', () => {
      const navigationStart = 220023532;
      const firstMeaningfulPaint = 2500 * 1000 + navigationStart;
      const traceEnd = 10000 * 1000 + navigationStart;
      const traceOfTab = {timestamps: {navigationStart, firstMeaningfulPaint, traceEnd}};

      const cpu = [];
      const network = generateNetworkRecords([], navigationStart);

      const result = ConsistentlyInteractive.findOverlappingQuietPeriods(cpu, network, traceOfTab);
      assert.deepEqual(result.cpuQuietPeriod, {start: 0, end: traceEnd / 1000});
      assert.deepEqual(result.networkQuietPeriod, {start: 0, end: traceEnd / 1000});
    });

    it('should throw when trace ended too soon after FMP', () => {
      const navigationStart = 220023532;
      const firstMeaningfulPaint = 2500 * 1000 + navigationStart;
      const traceEnd = 5000 * 1000 + navigationStart;
      const traceOfTab = {timestamps: {navigationStart, firstMeaningfulPaint, traceEnd}};

      const cpu = [];
      const network = generateNetworkRecords([], navigationStart);

      assert.throws(() => {
        ConsistentlyInteractive.findOverlappingQuietPeriods(cpu, network, traceOfTab);
      }, /activity continued/);
    });

    it('should throw when CPU is quiet but network is not', () => {
      const navigationStart = 220023532;
      const firstMeaningfulPaint = 2500 * 1000 + navigationStart;
      const traceEnd = 10000 * 1000 + navigationStart;
      const traceOfTab = {timestamps: {navigationStart, firstMeaningfulPaint, traceEnd}};

      const cpu = [];
      const network = generateNetworkRecords([
        {start: 1400, end: 1900},
        {start: 2000, end: 9000},
        {start: 2000, end: 8000},
        {start: 2000, end: 8500},
      ], navigationStart);

      assert.throws(() => {
        ConsistentlyInteractive.findOverlappingQuietPeriods(cpu, network, traceOfTab);
      }, /Network activity continued/);
    });

    it('should throw when network is quiet but CPU is not', () => {
      const navigationStart = 220023532;
      const firstMeaningfulPaint = 2500 * 1000 + navigationStart;
      const traceEnd = 10000 * 1000 + navigationStart;
      const traceOfTab = {timestamps: {navigationStart, firstMeaningfulPaint, traceEnd}};

      const cpu = [
        {start: 3000, end: 8000},
      ];
      const network = generateNetworkRecords([
        {start: 0, end: 1900},
      ], navigationStart);

      assert.throws(() => {
        ConsistentlyInteractive.findOverlappingQuietPeriods(cpu, network, traceOfTab);
      }, /Main thread activity continued/);
    });

    it('should handle unfinished network requests', () => {
      const navigationStart = 220023532;
      const firstMeaningfulPaint = 2500 * 1000 + navigationStart;
      const traceEnd = 10000 * 1000 + navigationStart;
      const traceOfTab = {timestamps: {navigationStart, firstMeaningfulPaint, traceEnd}};

      const cpu = [];
      const network = generateNetworkRecords([
        {start: 0, end: -1, finished: false},
        {start: 0, end: -1, finished: false},
        {start: 0, end: -1, finished: false},
      ], navigationStart);

      assert.throws(() => {
        ConsistentlyInteractive.findOverlappingQuietPeriods(cpu, network, traceOfTab);
      }, /Network activity continued/);
    });

    it('should find first overlapping quiet period', () => {
      const navigationStart = 220023532;
      const firstMeaningfulPaint = 10000 * 1000 + navigationStart;
      const traceEnd = 45000 * 1000 + navigationStart;
      const traceOfTab = {timestamps: {navigationStart, firstMeaningfulPaint, traceEnd}};

      const cpu = [
        // quiet period before FMP
        {start: 9000, end: 9900},
        {start: 11000, end: 13000},
        // quiet period during network activity
        {start: 18500, end: 22000},
        {start: 23500, end: 26000},
        // 2nd quiet period during network activity
        {start: 31500, end: 34000},
        // final quiet period
      ];

      const network = generateNetworkRecords([
        // initial page load + script
        {start: 1400, end: 1900},
        {start: 1900, end: 9000},
        // script requests more content
        {start: 11500, end: 18500},
        {start: 11500, end: 19000},
        {start: 11500, end: 19000},
        {start: 11500, end: 19500},
        // quiet period during Main thread activity
        {start: 28000, end: 32000},
        {start: 28000, end: 32000},
        {start: 28000, end: 35000},
        // final quiet period
      ], navigationStart);

      const result = ConsistentlyInteractive.findOverlappingQuietPeriods(cpu, network, traceOfTab);
      assert.deepEqual(result.cpuQuietPeriod, {
        start: 34000 + navigationStart / 1000,
        end: traceEnd / 1000,
      });
      assert.deepEqual(result.networkQuietPeriod, {
        start: 32000 + navigationStart / 1000,
        end: traceEnd / 1000,
      });
      assert.equal(result.cpuQuietPeriods.length, 3);
      assert.equal(result.networkQuietPeriods.length, 2);
    });
  });
});
